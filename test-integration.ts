#!/usr/bin/env bun
// Integration test to verify all components work together

import { SessionFinder } from './src/finder.js';
import { processTranscript } from './src/parser/utils.js';
import { aggregateResponseTimes, formatTime } from './src/aggregator.js';
import { exportToFile } from './src/export/index.js';

async function testIntegration() {
  console.log('🧪 Testing cctime integration...\n');
  
  try {
    // 1. Test Session Finder
    console.log('1️⃣  Testing Session Finder...');
    const finder = new SessionFinder();
    const sessions = await finder.findSessions({ 
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    });
    console.log(`   ✓ Found ${sessions.length} sessions`);
    
    if (sessions.length === 0) {
      console.log('   ⚠️  No sessions found. Make sure you have Claude Code sessions in ~/.claude/projects/');
      return;
    }
    
    // 2. Test Parser & Calculator
    console.log('\n2️⃣  Testing Parser & Calculator...');
    const testSession = sessions[0];
    console.log(`   Processing session: ${testSession.sessionId}`);
    
    const { responseTimes } = await processTranscript(
      testSession.filePath,
      testSession.sessionId,
      testSession.projectPath
    );
    console.log(`   ✓ Found ${responseTimes.length} response times`);
    
    // 3. Test Aggregator
    console.log('\n3️⃣  Testing Aggregator...');
    const processedData = aggregateResponseTimes(responseTimes);
    console.log(`   ✓ Aggregated into ${processedData.daily.size} days`);
    console.log(`   ✓ Total response time: ${formatTime(processedData.summary.totalResponseTimeMs)}`);
    console.log(`   ✓ Average response time: ${formatTime(processedData.summary.averageResponseTimeMs)}`);
    
    // 4. Test Export
    console.log('\n4️⃣  Testing Export...');
    const exportPath = './test-export.json';
    await exportToFile(processedData, 'json', exportPath);
    console.log(`   ✓ Exported to ${exportPath}`);
    
    // 5. Display sample data
    console.log('\n5️⃣  Sample Daily Data:');
    let count = 0;
    for (const [date, data] of processedData.daily) {
      if (count++ >= 3) break;
      console.log(`   ${date}: ${data.responseCount} responses, avg ${formatTime(data.averageResponseTimeMs)}`);
    }
    
    console.log('\n✅ All components working correctly!');
    console.log('\nYou can now run:');
    console.log('  bun run src/cli.tsx              # Interactive mode');
    console.log('  bun run src/cli.tsx --help       # See all options');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    console.error(error.stack);
  }
}

testIntegration();