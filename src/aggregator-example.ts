import {
  aggregateResponseTimes,
  formatTime,
  filterByDateRange,
  getTopSessions,
  getSessionsForDate
} from './aggregator.js';
import { ResponseTime } from './types.js';

// Example usage of the aggregator module

// Sample response times data
const responseTimes: ResponseTime[] = [
  {
    userMessageTimestamp: '2024-01-15T09:30:00.000Z',
    assistantMessageTimestamp: '2024-01-15T09:30:01.234Z',
    responseTimeMs: 1234,
    sessionId: 'session-abc123',
    projectPath: '/Users/user/my-project'
  },
  {
    userMessageTimestamp: '2024-01-15T10:15:00.000Z',
    assistantMessageTimestamp: '2024-01-15T10:15:02.500Z',
    responseTimeMs: 2500,
    sessionId: 'session-abc123',
    projectPath: '/Users/user/my-project'
  },
  {
    userMessageTimestamp: '2024-01-15T14:00:00.000Z',
    assistantMessageTimestamp: '2024-01-15T14:00:00.750Z',
    responseTimeMs: 750,
    sessionId: 'session-xyz789',
    projectPath: '/Users/user/another-project'
  },
  {
    userMessageTimestamp: '2024-01-16T08:00:00.000Z',
    assistantMessageTimestamp: '2024-01-16T08:00:03.000Z',
    responseTimeMs: 3000,
    sessionId: 'session-def456',
    projectPath: '/Users/user/my-project'
  }
];

// Aggregate the response times
const processedData = aggregateResponseTimes(responseTimes);

console.log('=== Summary Statistics ===');
console.log(`Total responses: ${processedData.summary.totalResponses}`);
console.log(`Total response time: ${formatTime(processedData.summary.totalResponseTimeMs)}`);
console.log(`Average response time: ${formatTime(processedData.summary.averageResponseTimeMs)}`);
console.log(`Unique sessions: ${processedData.summary.uniqueSessions}`);
console.log(`Date range: ${processedData.summary.dateRange.from} to ${processedData.summary.dateRange.to}`);

console.log('\n=== Daily Statistics ===');
for (const [date, dailyStats] of processedData.daily) {
  console.log(`\nDate: ${date}`);
  console.log(`  Responses: ${dailyStats.responseCount}`);
  console.log(`  Total time: ${formatTime(dailyStats.totalResponseTimeMs)}`);
  console.log(`  Average time: ${formatTime(dailyStats.averageResponseTimeMs)}`);
  console.log(`  Sessions: ${dailyStats.sessions.size}`);
  console.log(`  Percentiles:`);
  console.log(`    P50: ${formatTime(dailyStats.percentiles.p50)}`);
  console.log(`    P90: ${formatTime(dailyStats.percentiles.p90)}`);
  console.log(`    P99: ${formatTime(dailyStats.percentiles.p99)}`);
}

console.log('\n=== Session Metrics ===');
for (const [sessionId, session] of processedData.sessions) {
  console.log(`\nSession: ${sessionId}`);
  console.log(`  Project: ${session.projectPath}`);
  console.log(`  Total responses: ${session.totalResponses}`);
  console.log(`  Total time: ${formatTime(session.totalResponseTimeMs)}`);
  console.log(`  Average time: ${formatTime(session.averageResponseTimeMs)}`);
  console.log(`  Duration: ${session.firstMessage} to ${session.lastMessage}`);
}

// Example: Filter by date range
console.log('\n=== Filtered Data (Jan 15 only) ===');
const filteredData = filterByDateRange(
  processedData,
  new Date('2024-01-15'),
  new Date('2024-01-15')
);
console.log(`Filtered responses: ${filteredData.summary.totalResponses}`);
console.log(`Filtered sessions: ${filteredData.summary.uniqueSessions}`);

// Example: Get top sessions
console.log('\n=== Top 2 Sessions by Response Time ===');
const topSessions = getTopSessions(processedData.sessions, 2);
for (const session of topSessions) {
  console.log(`${session.sessionId}: ${formatTime(session.totalResponseTimeMs)}`);
}

// Example: Get sessions for a specific date
console.log('\n=== Sessions on 2024-01-15 ===');
const sessionsOnDate = getSessionsForDate(processedData, '2024-01-15');
for (const session of sessionsOnDate) {
  console.log(`${session.sessionId}: ${session.totalResponses} responses`);
}