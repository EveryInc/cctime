import { TranscriptEntry, ResponseTime } from '../types.js';
import { parseTranscriptFile, streamTranscriptFile } from './index.js';
import { calculateResponseTimes, filterOutliers } from '../calculator.js';
import { basename, dirname } from 'path';

/**
 * Extracts session ID from a transcript file path
 * Expected format: /path/to/claude-code/<session-id>/transcript.jsonl
 */
export function extractSessionId(filePath: string): string {
  const dir = dirname(filePath);
  const sessionId = basename(dir);
  return sessionId;
}

/**
 * Extracts project path from a transcript file path
 * The project path is typically stored in the session directory
 */
export function extractProjectPath(filePath: string): string {
  // For now, return the directory containing the session
  // In a real implementation, this might read from a metadata file
  return dirname(dirname(filePath));
}

/**
 * Process a transcript file and return response times
 * This is a convenience function that combines parsing and calculation
 */
export async function processTranscript(
  filePath: string,
  options?: {
    sessionId?: string;
    projectPath?: string;
    filterOutliers?: boolean;
    maxResponseTimeMs?: number;
  }
): Promise<{
  entries: TranscriptEntry[];
  responseTimes: ResponseTime[];
  sessionId: string;
  projectPath: string;
}> {
  // Extract or use provided session info
  const sessionId = options?.sessionId || extractSessionId(filePath);
  const projectPath = options?.projectPath || extractProjectPath(filePath);
  
  // Parse the transcript file
  const entries = await parseTranscriptFile(filePath);
  
  // Calculate response times
  let responseTimes = calculateResponseTimes(entries, sessionId, projectPath);
  
  // Filter outliers if requested
  if (options?.filterOutliers !== false) {
    responseTimes = filterOutliers(responseTimes, options?.maxResponseTimeMs);
  }
  
  return {
    entries,
    responseTimes,
    sessionId,
    projectPath,
  };
}

/**
 * Stream process a large transcript file
 * Useful for files that are too large to fit in memory
 */
export async function streamProcessTranscript(
  filePath: string,
  onResponseTime: (responseTime: ResponseTime) => void,
  options?: {
    sessionId?: string;
    projectPath?: string;
    filterOutliers?: boolean;
    maxResponseTimeMs?: number;
  }
): Promise<void> {
  const sessionId = options?.sessionId || extractSessionId(filePath);
  const projectPath = options?.projectPath || extractProjectPath(filePath);
  const maxResponseTime = options?.maxResponseTimeMs || 5 * 60 * 1000;
  
  const entries: TranscriptEntry[] = [];
  let lastUserMessage: TranscriptEntry | null = null;
  
  await streamTranscriptFile(filePath, (entry) => {
    entries.push(entry);
    
    // Process response times on the fly
    if (entry.type === 'user' && entry.message) {
      lastUserMessage = entry;
    } else if (entry.type === 'assistant' && entry.message && lastUserMessage) {
      const userTime = new Date(lastUserMessage.timestamp).getTime();
      const assistantTime = new Date(entry.timestamp).getTime();
      const responseTimeMs = assistantTime - userTime;
      
      if (responseTimeMs > 0 && (options?.filterOutliers === false || responseTimeMs <= maxResponseTime)) {
        onResponseTime({
          userMessageTimestamp: lastUserMessage.timestamp,
          assistantMessageTimestamp: entry.timestamp,
          responseTimeMs,
          sessionId,
          projectPath,
        });
      }
      
      lastUserMessage = null;
    } else if (entry.type === 'user' && !entry.message) {
      lastUserMessage = null;
    }
    
    // Keep a sliding window to prevent memory issues
    if (entries.length > 1000) {
      entries.shift();
    }
  });
}

/**
 * Batch process multiple transcript files
 */
export async function batchProcessTranscripts(
  filePaths: string[],
  options?: {
    filterOutliers?: boolean;
    maxResponseTimeMs?: number;
    onProgress?: (processed: number, total: number) => void;
  }
): Promise<Map<string, ResponseTime[]>> {
  const results = new Map<string, ResponseTime[]>();
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    try {
      const { responseTimes } = await processTranscript(filePath, {
        filterOutliers: options?.filterOutliers,
        maxResponseTimeMs: options?.maxResponseTimeMs,
      });
      
      results.set(filePath, responseTimes);
      
      if (options?.onProgress) {
        options.onProgress(i + 1, filePaths.length);
      }
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error);
      // Continue processing other files
    }
  }
  
  return results;
}

/**
 * Validate transcript file format
 */
export async function validateTranscriptFile(filePath: string): Promise<{
  valid: boolean;
  error?: string;
  entryCount?: number;
  userMessageCount?: number;
  assistantMessageCount?: number;
}> {
  try {
    let entryCount = 0;
    let userMessageCount = 0;
    let assistantMessageCount = 0;
    let hasValidStructure = false;
    
    await streamTranscriptFile(filePath, (entry) => {
      entryCount++;
      hasValidStructure = true;
      
      if (entry.type === 'user' && entry.message) {
        userMessageCount++;
      } else if (entry.type === 'assistant' && entry.message) {
        assistantMessageCount++;
      }
    });
    
    if (!hasValidStructure) {
      return {
        valid: false,
        error: 'No valid entries found in file',
      };
    }
    
    return {
      valid: true,
      entryCount,
      userMessageCount,
      assistantMessageCount,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}