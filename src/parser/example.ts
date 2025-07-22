import { parseTranscriptFile, streamTranscriptFile } from './index.js';
import { calculateResponseTimes, calculateStatistics, filterOutliers, groupByDate } from '../calculator.js';

/**
 * Example: Process a single transcript file
 */
async function processTranscriptFile(filePath: string, sessionId: string, projectPath: string) {
  console.log(`Processing transcript file: ${filePath}`);
  
  try {
    // Parse the entire file
    const entries = await parseTranscriptFile(filePath);
    console.log(`Found ${entries.length} entries`);
    
    // Calculate response times
    const responseTimes = calculateResponseTimes(entries, sessionId, projectPath);
    console.log(`Calculated ${responseTimes.length} response times`);
    
    // Filter outliers (responses taking more than 5 minutes)
    const filtered = filterOutliers(responseTimes);
    console.log(`Filtered to ${filtered.length} response times after removing outliers`);
    
    // Calculate statistics
    const stats = calculateStatistics(filtered);
    console.log('Statistics:', {
      average: `${(stats.average / 1000).toFixed(2)}s`,
      median: `${(stats.median / 1000).toFixed(2)}s`,
      p90: `${(stats.p90 / 1000).toFixed(2)}s`,
      p99: `${(stats.p99 / 1000).toFixed(2)}s`,
      count: stats.count,
    });
    
    // Group by date
    const byDate = groupByDate(filtered);
    console.log(`Response times across ${byDate.size} days`);
    
    return { entries, responseTimes: filtered, stats };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

/**
 * Example: Stream a large transcript file
 */
async function streamLargeTranscript(filePath: string, sessionId: string, projectPath: string) {
  console.log(`Streaming large transcript file: ${filePath}`);
  
  const entries: any[] = [];
  let userCount = 0;
  let assistantCount = 0;
  
  try {
    await streamTranscriptFile(filePath, (entry) => {
      // Process each entry as it's read
      entries.push(entry);
      
      if (entry.type === 'user') {
        userCount++;
      } else if (entry.type === 'assistant') {
        assistantCount++;
      }
      
      // Log progress every 1000 entries
      if (entries.length % 1000 === 0) {
        console.log(`Processed ${entries.length} entries...`);
      }
    });
    
    console.log(`Streaming complete: ${entries.length} total entries`);
    console.log(`User messages: ${userCount}, Assistant messages: ${assistantCount}`);
    
    // Calculate response times after streaming
    const responseTimes = calculateResponseTimes(entries, sessionId, projectPath);
    return responseTimes;
  } catch (error) {
    console.error('Error streaming file:', error);
    throw error;
  }
}

/**
 * Example: Process multiple transcript files
 */
async function processMultipleTranscripts(files: Array<{ path: string; sessionId: string; projectPath: string }>) {
  const allResponseTimes: any[] = [];
  
  for (const file of files) {
    try {
      const result = await processTranscriptFile(file.path, file.sessionId, file.projectPath);
      allResponseTimes.push(...result.responseTimes);
    } catch (error) {
      console.error(`Failed to process ${file.path}:`, error);
      // Continue processing other files
    }
  }
  
  // Calculate overall statistics
  const overallStats = calculateStatistics(allResponseTimes);
  console.log('Overall statistics across all files:', overallStats);
  
  return allResponseTimes;
}

// Export example functions for testing
export { processTranscriptFile, streamLargeTranscript, processMultipleTranscripts };