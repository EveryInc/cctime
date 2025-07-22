import { TranscriptEntry } from '../types.js';
import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// Re-export utility functions
export * from './utils.js';

/**
 * Parses a single line from a JSONL transcript file
 * @param line - The raw line string from the file
 * @returns TranscriptEntry if valid, null if invalid or should be skipped
 */
export function parseTranscriptLine(line: string): TranscriptEntry | null {
  if (!line.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(line);
    
    // Validate required fields
    if (!parsed.type || !parsed.timestamp) {
      return null;
    }
    
    // Filter for relevant entry types
    const validTypes = ['user', 'assistant', 'system', 'tool_result'];
    if (!validTypes.includes(parsed.type)) {
      return null;
    }
    
    // Construct TranscriptEntry with type safety
    const entry: TranscriptEntry = {
      type: parsed.type,
      timestamp: parsed.timestamp,
    };
    
    // Add optional fields if present
    if (parsed.message !== undefined) {
      entry.message = parsed.message;
    }
    
    if (parsed.usage !== undefined) {
      entry.usage = {
        input_tokens: parsed.usage.input_tokens,
        output_tokens: parsed.usage.output_tokens,
        cache_read_input_tokens: parsed.usage.cache_read_input_tokens,
        cache_write_input_tokens: parsed.usage.cache_write_input_tokens,
      };
    }
    
    if (parsed.tool !== undefined) {
      entry.tool = parsed.tool;
    }
    
    if (parsed.result !== undefined) {
      entry.result = parsed.result;
    }
    
    return entry;
  } catch (error) {
    // Log error for debugging but don't throw
    console.error(`Failed to parse line: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Parses an entire JSONL transcript file
 * @param filePath - Path to the transcript file
 * @returns Promise resolving to array of valid TranscriptEntry objects
 */
export async function parseTranscriptFile(filePath: string): Promise<TranscriptEntry[]> {
  try {
    const fileContent = await readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const entries: TranscriptEntry[] = [];
    
    for (const line of lines) {
      const entry = parseTranscriptLine(line);
      if (entry) {
        entries.push(entry);
      }
    }
    
    return entries;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read transcript file: ${error.message}`);
    }
    throw new Error('Failed to read transcript file: Unknown error');
  }
}

/**
 * Streams a JSONL transcript file line by line for memory-efficient processing
 * @param filePath - Path to the transcript file
 * @param onEntry - Callback function called for each valid entry
 * @returns Promise that resolves when streaming is complete
 */
export async function streamTranscriptFile(
  filePath: string,
  onEntry: (entry: TranscriptEntry) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Handle Windows line endings
    });
    
    let lineNumber = 0;
    
    rl.on('line', (line: string) => {
      lineNumber++;
      try {
        const entry = parseTranscriptLine(line);
        if (entry) {
          onEntry(entry);
        }
      } catch (error) {
        // Log error with line number for debugging
        console.error(`Error parsing line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue processing other lines
      }
    });
    
    rl.on('error', (error: Error) => {
      reject(new Error(`Failed to stream transcript file: ${error.message}`));
    });
    
    rl.on('close', () => {
      resolve();
    });
    
    fileStream.on('error', (error: Error) => {
      reject(new Error(`Failed to open transcript file: ${error.message}`));
    });
  });
}

/**
 * Validates if a file contains valid JSONL transcript data
 * @param filePath - Path to the file to validate
 * @returns Promise resolving to boolean indicating if file is valid
 */
export async function isValidTranscriptFile(filePath: string): Promise<boolean> {
  try {
    let hasValidEntry = false;
    let lineCount = 0;
    
    await streamTranscriptFile(filePath, () => {
      hasValidEntry = true;
      lineCount++;
      // Stop after finding first valid entry for quick validation
      if (lineCount >= 1) {
        throw new Error('EARLY_EXIT');
      }
    }).catch(error => {
      if (error.message === 'EARLY_EXIT') {
        // This is expected, not an actual error
        return;
      }
      throw error;
    });
    
    return hasValidEntry;
  } catch (error) {
    return false;
  }
}