#!/usr/bin/env bun
// Minimal test without Ink UI

import { aggregateResponseTimes, formatTime } from './src/aggregator.js';

console.log('🧪 Testing cctime core functionality\n');

// Create test data
const testData = [
  {
    userMessageTimestamp: '2024-01-20T10:00:00Z',
    assistantMessageTimestamp: '2024-01-20T10:00:02.500Z',
    responseTimeMs: 2500,
    sessionId: 'test-1',
    projectPath: '/test'
  },
  {
    userMessageTimestamp: '2024-01-20T10:05:00Z',
    assistantMessageTimestamp: '2024-01-20T10:05:01.200Z',
    responseTimeMs: 1200,
    sessionId: 'test-1',
    projectPath: '/test'
  },
  {
    userMessageTimestamp: '2024-01-21T14:00:00Z',
    assistantMessageTimestamp: '2024-01-21T14:00:03.800Z',
    responseTimeMs: 3800,
    sessionId: 'test-2',
    projectPath: '/test'
  }
];

// Test aggregation
const result = aggregateResponseTimes(testData);

// Display results
console.log('📊 Aggregation Results:\n');
console.log(`Total responses: ${result.summary.totalResponses}`);
console.log(`Total time: ${formatTime(result.summary.totalResponseTimeMs)}`);
console.log(`Average time: ${formatTime(result.summary.averageResponseTimeMs)}`);
console.log(`Unique sessions: ${result.summary.uniqueSessions}`);

console.log('\n📅 Daily breakdown:');
for (const [date, data] of result.daily) {
  console.log(`\n${date}:`);
  console.log(`  Responses: ${data.responseCount}`);
  console.log(`  Average: ${formatTime(data.averageResponseTimeMs)}`);
  console.log(`  Sessions: ${data.sessions.size}`);
}

console.log('\n✅ Core functionality working!');