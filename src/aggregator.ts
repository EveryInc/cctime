import {
  ResponseTime,
  DailyResponseTime,
  SessionMetrics,
  SummaryStatistics,
  ProcessedData
} from './types';

/**
 * Helper function to format a date to YYYY-MM-DD format
 */
export function formatDateToDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate percentile from a sorted array of numbers
 */
export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Format milliseconds to human-readable format
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Group response times by day
 */
function groupByDay(responseTimes: ResponseTime[]): Map<string, ResponseTime[]> {
  const groups = new Map<string, ResponseTime[]>();
  
  for (const responseTime of responseTimes) {
    const day = formatDateToDay(responseTime.userMessageTimestamp);
    
    if (!groups.has(day)) {
      groups.set(day, []);
    }
    
    groups.get(day)!.push(responseTime);
  }
  
  return groups;
}

/**
 * Calculate daily statistics from grouped response times
 */
function calculateDailyStats(
  date: string,
  responseTimes: ResponseTime[]
): DailyResponseTime {
  const responseTimesMs = responseTimes.map(rt => rt.responseTimeMs);
  const sortedResponseTimes = [...responseTimesMs].sort((a, b) => a - b);
  
  const totalResponseTimeMs = responseTimesMs.reduce((sum, time) => sum + time, 0);
  const averageResponseTimeMs = totalResponseTimeMs / responseTimes.length;
  
  const sessions = new Set(responseTimes.map(rt => rt.sessionId));
  
  return {
    date,
    totalResponseTimeMs,
    averageResponseTimeMs,
    responseCount: responseTimes.length,
    sessions,
    percentiles: {
      p50: calculatePercentile(sortedResponseTimes, 50),
      p90: calculatePercentile(sortedResponseTimes, 90),
      p99: calculatePercentile(sortedResponseTimes, 99)
    }
  };
}

/**
 * Create session metrics from response times
 */
function createSessionMetrics(responseTimes: ResponseTime[]): Map<string, SessionMetrics> {
  const sessionMap = new Map<string, ResponseTime[]>();
  
  // Group by session
  for (const responseTime of responseTimes) {
    if (!sessionMap.has(responseTime.sessionId)) {
      sessionMap.set(responseTime.sessionId, []);
    }
    sessionMap.get(responseTime.sessionId)!.push(responseTime);
  }
  
  // Calculate metrics for each session
  const sessionMetrics = new Map<string, SessionMetrics>();
  
  for (const [sessionId, sessionResponses] of sessionMap) {
    // Sort by timestamp to get first and last messages
    const sortedResponses = [...sessionResponses].sort(
      (a, b) => new Date(a.userMessageTimestamp).getTime() - new Date(b.userMessageTimestamp).getTime()
    );
    
    const totalResponseTimeMs = sessionResponses.reduce(
      (sum, rt) => sum + rt.responseTimeMs,
      0
    );
    
    sessionMetrics.set(sessionId, {
      sessionId,
      projectPath: sessionResponses[0].projectPath,
      totalResponses: sessionResponses.length,
      totalResponseTimeMs,
      averageResponseTimeMs: totalResponseTimeMs / sessionResponses.length,
      firstMessage: sortedResponses[0].userMessageTimestamp,
      lastMessage: sortedResponses[sortedResponses.length - 1].assistantMessageTimestamp
    });
  }
  
  return sessionMetrics;
}

/**
 * Generate summary statistics from all response times
 */
function generateSummaryStatistics(
  responseTimes: ResponseTime[],
  sessionMetrics: Map<string, SessionMetrics>
): SummaryStatistics {
  if (responseTimes.length === 0) {
    return {
      totalResponseTimeMs: 0,
      totalResponses: 0,
      averageResponseTimeMs: 0,
      uniqueSessions: 0,
      dateRange: {
        from: '',
        to: ''
      }
    };
  }
  
  const totalResponseTimeMs = responseTimes.reduce(
    (sum, rt) => sum + rt.responseTimeMs,
    0
  );
  
  const timestamps = responseTimes.map(rt => new Date(rt.userMessageTimestamp).getTime());
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  
  return {
    totalResponseTimeMs,
    totalResponses: responseTimes.length,
    averageResponseTimeMs: totalResponseTimeMs / responseTimes.length,
    uniqueSessions: sessionMetrics.size,
    dateRange: {
      from: new Date(minTimestamp).toISOString(),
      to: new Date(maxTimestamp).toISOString()
    }
  };
}

/**
 * Main aggregator function that processes response times into structured data
 */
export function aggregateResponseTimes(responseTimes: ResponseTime[]): ProcessedData {
  // Group by day
  const groupedByDay = groupByDay(responseTimes);
  
  // Calculate daily statistics
  const dailyStats = new Map<string, DailyResponseTime>();
  for (const [date, dayResponses] of groupedByDay) {
    dailyStats.set(date, calculateDailyStats(date, dayResponses));
  }
  
  // Create session metrics
  const sessionMetrics = createSessionMetrics(responseTimes);
  
  // Generate summary statistics
  const summary = generateSummaryStatistics(responseTimes, sessionMetrics);
  
  return {
    daily: dailyStats,
    sessions: sessionMetrics,
    summary
  };
}

/**
 * Helper function to merge multiple ProcessedData objects
 * Useful when aggregating data from multiple sources or time periods
 */
export function mergeProcessedData(...dataSets: ProcessedData[]): ProcessedData {
  const allResponseTimes: ResponseTime[] = [];
  
  // Extract response times from each dataset
  for (const data of dataSets) {
    // We need to reconstruct response times from the aggregated data
    // This is a simplified approach - in a real scenario, you might want to
    // keep the original response times or implement a more sophisticated merge
    for (const [_, session] of data.sessions) {
      // Create synthetic response times for merging
      // Note: This is a limitation of the current design
      // Consider storing raw response times in ProcessedData if needed
    }
  }
  
  // For now, implement a simple merge of the maps
  const mergedDaily = new Map<string, DailyResponseTime>();
  const mergedSessions = new Map<string, SessionMetrics>();
  
  for (const data of dataSets) {
    // Merge daily data
    for (const [date, dailyData] of data.daily) {
      if (mergedDaily.has(date)) {
        // Merge the data for the same date
        const existing = mergedDaily.get(date)!;
        const responseTimes = [
          ...Array(existing.responseCount).fill(existing.averageResponseTimeMs),
          ...Array(dailyData.responseCount).fill(dailyData.averageResponseTimeMs)
        ].sort((a, b) => a - b);
        
        mergedDaily.set(date, {
          date,
          totalResponseTimeMs: existing.totalResponseTimeMs + dailyData.totalResponseTimeMs,
          averageResponseTimeMs: (existing.totalResponseTimeMs + dailyData.totalResponseTimeMs) / 
                                 (existing.responseCount + dailyData.responseCount),
          responseCount: existing.responseCount + dailyData.responseCount,
          sessions: new Set([...existing.sessions, ...dailyData.sessions]),
          percentiles: {
            p50: calculatePercentile(responseTimes, 50),
            p90: calculatePercentile(responseTimes, 90),
            p99: calculatePercentile(responseTimes, 99)
          }
        });
      } else {
        mergedDaily.set(date, dailyData);
      }
    }
    
    // Merge session data
    for (const [sessionId, sessionData] of data.sessions) {
      mergedSessions.set(sessionId, sessionData);
    }
  }
  
  // Calculate new summary
  let totalResponseTimeMs = 0;
  let totalResponses = 0;
  let allDates: string[] = [];
  
  for (const dailyData of mergedDaily.values()) {
    totalResponseTimeMs += dailyData.totalResponseTimeMs;
    totalResponses += dailyData.responseCount;
    allDates.push(dailyData.date);
  }
  
  allDates.sort();
  
  const summary: SummaryStatistics = {
    totalResponseTimeMs,
    totalResponses,
    averageResponseTimeMs: totalResponses > 0 ? totalResponseTimeMs / totalResponses : 0,
    uniqueSessions: mergedSessions.size,
    dateRange: {
      from: allDates[0] || '',
      to: allDates[allDates.length - 1] || ''
    }
  };
  
  return {
    daily: mergedDaily,
    sessions: mergedSessions,
    summary
  };
}

/**
 * Filter processed data by date range
 */
export function filterByDateRange(
  data: ProcessedData,
  from: Date,
  to: Date
): ProcessedData {
  const filteredDaily = new Map<string, DailyResponseTime>();
  const relevantSessions = new Set<string>();
  
  for (const [date, dailyData] of data.daily) {
    const dateObj = new Date(date);
    if (dateObj >= from && dateObj <= to) {
      filteredDaily.set(date, dailyData);
      dailyData.sessions.forEach(session => relevantSessions.add(session));
    }
  }
  
  const filteredSessions = new Map<string, SessionMetrics>();
  for (const sessionId of relevantSessions) {
    if (data.sessions.has(sessionId)) {
      filteredSessions.set(sessionId, data.sessions.get(sessionId)!);
    }
  }
  
  // Recalculate summary for filtered data
  let totalResponseTimeMs = 0;
  let totalResponses = 0;
  const dates = Array.from(filteredDaily.keys()).sort();
  
  for (const dailyData of filteredDaily.values()) {
    totalResponseTimeMs += dailyData.totalResponseTimeMs;
    totalResponses += dailyData.responseCount;
  }
  
  const summary: SummaryStatistics = {
    totalResponseTimeMs,
    totalResponses,
    averageResponseTimeMs: totalResponses > 0 ? totalResponseTimeMs / totalResponses : 0,
    uniqueSessions: filteredSessions.size,
    dateRange: {
      from: dates[0] || '',
      to: dates[dates.length - 1] || ''
    }
  };
  
  return {
    daily: filteredDaily,
    sessions: filteredSessions,
    summary
  };
}

/**
 * Get top N sessions by total response time
 */
export function getTopSessions(
  sessions: Map<string, SessionMetrics>,
  n: number = 10
): SessionMetrics[] {
  return Array.from(sessions.values())
    .sort((a, b) => b.totalResponseTimeMs - a.totalResponseTimeMs)
    .slice(0, n);
}

/**
 * Get sessions for a specific date
 */
export function getSessionsForDate(
  data: ProcessedData,
  date: string
): SessionMetrics[] {
  const dailyData = data.daily.get(date);
  if (!dailyData) return [];
  
  const sessions: SessionMetrics[] = [];
  for (const sessionId of dailyData.sessions) {
    const session = data.sessions.get(sessionId);
    if (session) {
      sessions.push(session);
    }
  }
  
  return sessions;
}