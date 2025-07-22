#!/usr/bin/env bun
// Simple test to check basic functionality

console.log('Testing basic imports...');

try {
  // Test types
  const types = await import('./src/types/index.js');
  console.log('✓ Types imported');
  
  // Test parser
  const parser = await import('./src/parser/index.js');
  console.log('✓ Parser imported');
  
  // Test aggregator  
  const aggregator = await import('./src/aggregator.js');
  console.log('✓ Aggregator imported');
  
  // Create sample data
  const sampleResponseTimes = [
    {
      userMessageTimestamp: '2024-01-01T10:00:00Z',
      assistantMessageTimestamp: '2024-01-01T10:00:05Z',
      responseTimeMs: 5000,
      sessionId: 'test-session',
      projectPath: '/test/project'
    },
    {
      userMessageTimestamp: '2024-01-01T10:05:00Z',
      assistantMessageTimestamp: '2024-01-01T10:05:03Z',
      responseTimeMs: 3000,
      sessionId: 'test-session',
      projectPath: '/test/project'
    }
  ];
  
  // Test aggregation
  const result = aggregator.aggregateResponseTimes(sampleResponseTimes);
  console.log('✓ Aggregation works');
  console.log(`  Daily entries: ${result.daily.size}`);
  console.log(`  Total time: ${aggregator.formatTime(result.summary.totalResponseTimeMs)}`);
  console.log(`  Avg time: ${aggregator.formatTime(result.summary.averageResponseTimeMs)}`);
  
  console.log('\n✅ Basic functionality test passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}