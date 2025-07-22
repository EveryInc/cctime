import { TranscriptEntry, ResponseTime, ProcessedData, DailyResponseTime, SessionMetrics, SummaryStatistics } from './types.js';

/**
 * Calculates response times by matching user messages with assistant responses
 * @param entries - Array of transcript entries
 * @param sessionId - Session identifier
 * @param projectPath - Project path for the session
 * @returns Array of ResponseTime objects
 */
export function calculateResponseTimes(
  entries: TranscriptEntry[],
  sessionId: string,
  projectPath: string
): ResponseTime[] {
  const responseTimes: ResponseTime[] = [];
  let lastUserMessage: TranscriptEntry | null = null;
  
  for (const entry of entries) {
    if (entry.type === 'user' && entry.message) {
      // Store the user message for potential matching
      lastUserMessage = entry;
    } else if (entry.type === 'assistant' && entry.message && lastUserMessage) {
      // Calculate response time
      const userTime = new Date(lastUserMessage.timestamp).getTime();
      const assistantTime = new Date(entry.timestamp).getTime();
      const responseTimeMs = assistantTime - userTime;
      
      // Only record positive response times (assistant after user)
      if (responseTimeMs > 0) {
        responseTimes.push({
          userMessageTimestamp: lastUserMessage.timestamp,
          assistantMessageTimestamp: entry.timestamp,
          responseTimeMs,
          sessionId,
          projectPath,
        });
      }
      
      // Reset after matching
      lastUserMessage = null;
    } else if (entry.type === 'user' && !entry.message) {
      // Handle interruptions - user action without message might indicate interruption
      lastUserMessage = null;
    }
  }
  
  return responseTimes;
}

/**
 * Filters response times to remove outliers
 * @param responseTimes - Array of response times
 * @param maxResponseTimeMs - Maximum reasonable response time (default: 5 minutes)
 * @returns Filtered array of response times
 */
export function filterOutliers(
  responseTimes: ResponseTime[],
  maxResponseTimeMs: number = 5 * 60 * 1000 // 5 minutes
): ResponseTime[] {
  return responseTimes.filter(rt => rt.responseTimeMs <= maxResponseTimeMs);
}

/**
 * Groups response times by date
 * @param responseTimes - Array of response times
 * @returns Map of date strings to arrays of response times
 */
export function groupByDate(responseTimes: ResponseTime[]): Map<string, ResponseTime[]> {
  const grouped = new Map<string, ResponseTime[]>();
  
  for (const rt of responseTimes) {
    const date = new Date(rt.userMessageTimestamp).toISOString().split('T')[0];
    const existing = grouped.get(date) || [];
    existing.push(rt);
    grouped.set(date, existing);
  }
  
  return grouped;
}

/**
 * Calculates percentiles for an array of numbers
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns The percentile value
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculates statistics for a set of response times
 * @param responseTimes - Array of response times
 * @returns Object with statistical measures
 */
export function calculateStatistics(responseTimes: ResponseTime[]): {
  average: number;
  median: number;
  min: number;
  max: number;
  p90: number;
  p99: number;
  count: number;
} {
  if (responseTimes.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      p90: 0,
      p99: 0,
      count: 0,
    };
  }
  
  const times = responseTimes.map(rt => rt.responseTimeMs);
  const sum = times.reduce((acc, time) => acc + time, 0);
  
  return {
    average: sum / times.length,
    median: calculatePercentile(times, 50),
    min: Math.min(...times),
    max: Math.max(...times),
    p90: calculatePercentile(times, 90),
    p99: calculatePercentile(times, 99),
    count: times.length,
  };
}

/**
 * Identifies consecutive user messages without assistant responses
 * @param entries - Array of transcript entries
 * @returns Array of timestamps where user messages were not answered
 */
export function findUnansweredMessages(entries: TranscriptEntry[]): string[] {
  const unanswered: string[] = [];
  let lastUserMessage: TranscriptEntry | null = null;
  
  for (const entry of entries) {
    if (entry.type === 'user' && entry.message) {
      if (lastUserMessage) {
        // Previous user message was not answered
        unanswered.push(lastUserMessage.timestamp);
      }
      lastUserMessage = entry;
    } else if (entry.type === 'assistant' && entry.message) {
      // User message was answered
      lastUserMessage = null;
    }
  }
  
  // Check if the last message was unanswered
  if (lastUserMessage) {
    unanswered.push(lastUserMessage.timestamp);
  }
  
  return unanswered;
}

/**
 * Detects potential session interruptions based on time gaps
 * @param entries - Array of transcript entries
 * @param gapThresholdMs - Minimum gap to consider as interruption (default: 30 minutes)
 * @returns Array of interruption points with timestamps
 */
export function detectInterruptions(
  entries: TranscriptEntry[],
  gapThresholdMs: number = 30 * 60 * 1000 // 30 minutes
): Array<{ before: string; after: string; gapMs: number }> {
  const interruptions: Array<{ before: string; after: string; gapMs: number }> = [];
  
  for (let i = 1; i < entries.length; i++) {
    const prevTime = new Date(entries[i - 1].timestamp).getTime();
    const currTime = new Date(entries[i].timestamp).getTime();
    const gap = currTime - prevTime;
    
    if (gap > gapThresholdMs) {
      interruptions.push({
        before: entries[i - 1].timestamp,
        after: entries[i].timestamp,
        gapMs: gap,
      });
    }
  }
  
  return interruptions;
}

/**
 * Converts response times into processed metrics data
 * @param responseTimes - Array of response times
 * @returns ProcessedData with daily, session, and summary metrics
 */
export function calculateMetrics(responseTimes: ResponseTime[]): ProcessedData {
  const daily = new Map<string, DailyResponseTime>();
  const sessions = new Map<string, SessionMetrics>();
  
  // Group by date and session
  const dateGroups = groupByDate(responseTimes);
  const sessionGroups = new Map<string, ResponseTime[]>();
  
  // Group by session
  for (const rt of responseTimes) {
    const existing = sessionGroups.get(rt.sessionId) || [];
    existing.push(rt);
    sessionGroups.set(rt.sessionId, existing);
  }
  
  // Calculate daily metrics
  for (const [date, dayResponses] of dateGroups) {
    const times = dayResponses.map(rt => rt.responseTimeMs);
    const sessionsForDay = new Set(dayResponses.map(rt => rt.sessionId));
    
    daily.set(date, {
      date,
      totalResponseTimeMs: times.reduce((sum, t) => sum + t, 0),
      averageResponseTimeMs: times.reduce((sum, t) => sum + t, 0) / times.length,
      responseCount: dayResponses.length,
      sessions: sessionsForDay,
      percentiles: {
        p50: calculatePercentile(times, 50),
        p90: calculatePercentile(times, 90),
        p99: calculatePercentile(times, 99)
      }
    });
  }
  
  // Calculate session metrics
  for (const [sessionId, sessionResponses] of sessionGroups) {
    const times = sessionResponses.map(rt => rt.responseTimeMs);
    const timestamps = sessionResponses.map(rt => rt.userMessageTimestamp);
    
    sessions.set(sessionId, {
      sessionId,
      projectPath: sessionResponses[0].projectPath,
      totalResponses: sessionResponses.length,
      totalResponseTimeMs: times.reduce((sum, t) => sum + t, 0),
      averageResponseTimeMs: times.reduce((sum, t) => sum + t, 0) / times.length,
      firstMessage: timestamps.sort()[0],
      lastMessage: timestamps.sort()[timestamps.length - 1]
    });
  }
  
  // Calculate summary statistics
  const allTimes = responseTimes.map(rt => rt.responseTimeMs);
  const allDates = Array.from(daily.keys()).sort();
  
  const summary: SummaryStatistics = {
    totalResponseTimeMs: allTimes.reduce((sum, t) => sum + t, 0),
    totalResponses: responseTimes.length,
    averageResponseTimeMs: responseTimes.length > 0 
      ? allTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
      : 0,
    uniqueSessions: sessions.size,
    dateRange: {
      from: allDates[0] || '',
      to: allDates[allDates.length - 1] || ''
    }
  };
  
  return { daily, sessions, summary };
}