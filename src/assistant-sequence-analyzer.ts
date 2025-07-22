import { TranscriptEntry } from './types/index.js';
import { parseTranscriptFile } from './parser/index.js';
import { readFile } from 'fs/promises';

export interface AssistantSequence {
  userMessage: string;
  userTimestamp: string;
  firstAssistantTimestamp: string;
  lastAssistantTimestamp: string;
  responseTimeMs: number;  // Time from user to first assistant message
  durationMs: number;      // Time from first to last assistant message
  messageCount: number;
  toolUseCount: number;
}

/**
 * Extract text content from a message object
 */
function extractMessageText(message: any): string {
  if (typeof message === 'string') {
    return message;
  }
  
  if (message && typeof message === 'object') {
    // Handle Claude's message format
    if (message.content && Array.isArray(message.content)) {
      // Filter for actual text content (not tool results)
      const textContent = message.content
        .filter((c: any) => c.type === 'text' && !c.tool_use_id)
        .map((c: any) => c.text || '')
        .join(' ')
        .trim();
      
      // If we found text content, return it
      if (textContent) {
        return textContent;
      }
      
      // Check if this is a tool result (user responding to tool use)
      const toolResult = message.content.find((c: any) => c.type === 'tool_result');
      if (toolResult) {
        return '[Tool result response]';
      }
    }
    
    // Fallback to message.text if it exists
    if (message.text) {
      return message.text;
    }
  }
  
  return '[No text content]';
}

export interface SessionSequenceAnalysis {
  sessionId: string;
  projectPath: string;
  sequences: AssistantSequence[];
  longestSequence: AssistantSequence | null;
  timeDistribution: {
    '0-10s': number;
    '10-30s': number;
    '30-60s': number;
    '1-5m': number;
    '5m+': number;
  };
}

/**
 * Analyzes a transcript to find assistant response sequences
 */
export async function analyzeAssistantSequences(
  filePath: string,
  sessionId: string,
  projectPath: string
): Promise<SessionSequenceAnalysis> {
  // Read raw file to access all fields including isCompactSummary
  const fileContent = await readFile(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  const rawEntries: any[] = [];
  
  // Parse each line to get both raw data and parsed entries
  for (const line of lines) {
    try {
      const rawEntry = JSON.parse(line);
      rawEntries.push(rawEntry);
    } catch (error) {
      // Skip invalid lines
    }
  }
  
  const sequences: AssistantSequence[] = [];
  
  let i = 0;
  while (i < rawEntries.length) {
    // Find TRUE user message (not tool results)
    const entry = rawEntries[i];
    if (entry.type === 'user' && entry.message) {
      const userEntry = entry;
      
      // Check if this is a compact summary (session continuation)
      if (userEntry.isCompactSummary === true) {
        i++;
        continue; // Skip compact summaries as they're not real user messages
      }
      
      // Check if this is actually a tool result (not a real user message)
      const messageObj = userEntry.message as any;
      
      // Skip command messages and system messages
      if (typeof messageObj === 'string') {
        if (messageObj.includes('<command-') || 
            messageObj.includes('<system-reminder>') ||
            messageObj.includes('<user-prompt-submit-hook>')) {
          i++;
          continue; // Skip synthetic/system messages
        }
      }
      
      // Skip if message.role exists and content is array with tool_use_id
      if (messageObj && messageObj.role === 'user' && messageObj.content) {
        if (Array.isArray(messageObj.content)) {
          const hasToolResult = messageObj.content.some((c: any) => 
            c.tool_use_id || c.type === 'tool_result'
          );
          if (hasToolResult) {
            i++;
            continue; // Skip tool results
          }
        }
      }
      
      // Also check for direct string content (older format)
      if (typeof messageObj === 'string') {
        // Direct string message - this is a real user message
      } else if (!messageObj.role && !messageObj.content) {
        // Some other format we don't recognize
        i++;
        continue;
      }
      
      const userMessage = extractMessageText(userEntry.message);
      const userTimestamp = userEntry.timestamp;
      
      // Skip empty messages
      if (!userMessage || userMessage === '[No text content]') {
        i++;
        continue;
      }
      
      // Find subsequent assistant messages
      let firstAssistantIndex = -1;
      let lastAssistantIndex = -1;
      let messageCount = 0;
      let toolUseCount = 0;
      
      // Look for assistant responses after this user message
      for (let j = i + 1; j < rawEntries.length; j++) {
        const entry = rawEntries[j];
        
        // Check if this is a TRUE user message (not a tool result)
        if (entry.type === 'user') {
          // Check if this is a compact summary (session continuation)
          if (entry.isCompactSummary === true) {
            // Continue through compact summaries as they're not real user messages
            continue;
          }
          
          const msgObj = entry.message as any;
          if (msgObj && typeof msgObj === 'string') {
            // Check if it's a synthetic/system message
            if (msgObj.includes('<command-') || 
                msgObj.includes('<system-reminder>') ||
                msgObj.includes('<user-prompt-submit-hook>')) {
              continue; // Skip synthetic/system messages
            }
            break; // Real user message as string
          }
          if (msgObj && msgObj.role === 'user' && msgObj.content) {
            if (typeof msgObj.content === 'string') {
              break; // Real user message with string content
            }
            if (Array.isArray(msgObj.content)) {
              const hasToolResult = msgObj.content.some((c: any) => 
                c.tool_use_id || c.type === 'tool_result'
              );
              if (!hasToolResult) {
                break; // Real user message (no tool results)
              }
              // Otherwise, this is a tool result, continue processing
            }
          }
        }
        
        // Track assistant messages
        if (entry.type === 'assistant') {
          if (firstAssistantIndex === -1) {
            firstAssistantIndex = j;
          }
          lastAssistantIndex = j;
          
          if (entry.message) {
            messageCount++;
            const msg = entry.message as any;
            if (msg && msg.content && Array.isArray(msg.content)) {
              const toolUses = msg.content.filter((c: any) => c.type === 'tool_use').length;
              toolUseCount += toolUses;
            }
          }
        }
        // Note: We don't update lastAssistantIndex for tool results (user entries)
        // as they are interleaved messages, not the end of the sequence
      }
      
      // If we found assistant messages, create a sequence
      if (firstAssistantIndex !== -1 && lastAssistantIndex !== -1) {
        const userTime = new Date(userTimestamp);
        const firstTimestamp = new Date(rawEntries[firstAssistantIndex].timestamp);
        const lastTimestamp = new Date(rawEntries[lastAssistantIndex].timestamp);
        const responseTimeMs = firstTimestamp.getTime() - userTime.getTime();
        const durationMs = lastTimestamp.getTime() - firstTimestamp.getTime();
        
        sequences.push({
          userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
          userTimestamp,
          firstAssistantTimestamp: rawEntries[firstAssistantIndex].timestamp,
          lastAssistantTimestamp: rawEntries[lastAssistantIndex].timestamp,
          responseTimeMs,
          durationMs,
          messageCount,
          toolUseCount
        });
      }
      
      // Move to the next user message
      i = lastAssistantIndex !== -1 ? lastAssistantIndex + 1 : i + 1;
    } else {
      i++;
    }
  }
  
  // Find longest sequence
  const longestSequence = sequences.length > 0
    ? sequences.reduce((longest, current) => 
        current.durationMs > longest.durationMs ? current : longest
      )
    : null;
  
  // Calculate time distribution based on processing time (first to last assistant)
  const timeDistribution = {
    '0-10s': 0,
    '10-30s': 0,
    '30-60s': 0,
    '1-5m': 0,
    '5m+': 0
  };
  
  sequences.forEach(seq => {
    // Use durationMs for the distribution (time assistant spent "talking to itself")
    const seconds = seq.durationMs / 1000;
    if (seconds <= 10) {
      timeDistribution['0-10s']++;
    } else if (seconds <= 30) {
      timeDistribution['10-30s']++;
    } else if (seconds <= 60) {
      timeDistribution['30-60s']++;
    } else if (seconds <= 300) { // 5 minutes
      timeDistribution['1-5m']++;
    } else {
      timeDistribution['5m+']++;
    }
  });
  
  return {
    sessionId,
    projectPath,
    sequences,
    longestSequence,
    timeDistribution
  };
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}