#!/usr/bin/env bun
// Demo script showing cctime functionality

import { aggregateResponseTimes, formatTime } from './src/aggregator.js';
import { exportToFile } from './src/export/index.js';

console.log('🚀 Claude Code Response Time Analyzer Demo\n');

// Create sample response times data
const sampleData = [
  // Day 1
  { date: '2024-01-15', responseTime: 2500, session: 'session-1' },
  { date: '2024-01-15', responseTime: 3200, session: 'session-1' },
  { date: '2024-01-15', responseTime: 1800, session: 'session-2' },
  { date: '2024-01-15', responseTime: 4100, session: 'session-2' },
  
  // Day 2
  { date: '2024-01-16', responseTime: 1200, session: 'session-3' },
  { date: '2024-01-16', responseTime: 2800, session: 'session-3' },
  { date: '2024-01-16', responseTime: 3500, session: 'session-4' },
  
  // Day 3
  { date: '2024-01-17', responseTime: 5000, session: 'session-5' },
  { date: '2024-01-17', responseTime: 2200, session: 'session-5' },
  { date: '2024-01-17', responseTime: 1500, session: 'session-5' },
  { date: '2024-01-17', responseTime: 3800, session: 'session-6' },
];

// Convert to ResponseTime format
const responseTimes = sampleData.map(item => ({
  userMessageTimestamp: `${item.date}T10:00:00Z`,
  assistantMessageTimestamp: `${item.date}T10:00:${Math.floor(item.responseTime / 1000).toString().padStart(2, '0')}Z`,
  responseTimeMs: item.responseTime,
  sessionId: item.session,
  projectPath: '/demo/project'
}));

// Aggregate the data
console.log('📊 Aggregating response times...\n');
const processedData = aggregateResponseTimes(responseTimes);

// Display summary
console.log('📈 Summary Statistics:');
console.log(`   Total Responses: ${processedData.summary.totalResponses}`);
console.log(`   Total Time: ${formatTime(processedData.summary.totalResponseTimeMs)}`);
console.log(`   Average Time: ${formatTime(processedData.summary.averageResponseTimeMs)}`);
console.log(`   Unique Sessions: ${processedData.summary.uniqueSessions}`);
console.log(`   Date Range: ${processedData.summary.dateRange.from} to ${processedData.summary.dateRange.to}`);

// Display daily breakdown
console.log('\n📅 Daily Breakdown:');
for (const [date, metrics] of processedData.daily) {
  console.log(`\n   ${date}:`);
  console.log(`     Responses: ${metrics.responseCount}`);
  console.log(`     Total Time: ${formatTime(metrics.totalResponseTimeMs)}`);
  console.log(`     Average: ${formatTime(metrics.averageResponseTimeMs)}`);
  console.log(`     Sessions: ${metrics.sessions.size}`);
  console.log(`     P50: ${formatTime(metrics.percentiles.p50)}`);
  console.log(`     P90: ${formatTime(metrics.percentiles.p90)}`);
}

// Display session breakdown
console.log('\n🗂️  Top Sessions by Response Time:');
const sortedSessions = Array.from(processedData.sessions.values())
  .sort((a, b) => b.totalResponseTimeMs - a.totalResponseTimeMs)
  .slice(0, 3);

for (const session of sortedSessions) {
  console.log(`\n   ${session.sessionId}:`);
  console.log(`     Total Time: ${formatTime(session.totalResponseTimeMs)}`);
  console.log(`     Responses: ${session.totalResponses}`);
  console.log(`     Average: ${formatTime(session.averageResponseTimeMs)}`);
}

// Export examples
console.log('\n💾 Exporting data...');
try {
  await exportToFile(processedData, 'json', './demo-export.json');
  console.log('   ✓ JSON export: ./demo-export.json');
  
  await exportToFile(processedData, 'csv', './demo-export.csv');
  console.log('   ✓ CSV export: ./demo-export.csv');
  
  await exportToFile(processedData, 'markdown', './demo-export.md');
  console.log('   ✓ Markdown export: ./demo-export.md');
} catch (error) {
  console.error('   ❌ Export error:', error.message);
}

console.log('\n✨ Demo complete!');
console.log('\nTo analyze your actual Claude Code sessions, run:');
console.log('  bun run src/cli.tsx');
console.log('\nFor help:');
console.log('  bun run src/cli.tsx --help');