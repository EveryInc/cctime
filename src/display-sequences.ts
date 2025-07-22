import chalk from 'chalk';
import { SessionSequenceAnalysis, formatDuration } from './assistant-sequence-analyzer.js';

export function displaySequenceAnalysis(analyses: SessionSequenceAnalysis[]): void {
  console.clear();
  
  // Header
  console.log(chalk.cyan.bold('\n🤖 Claude Assistant Response Sequence Analysis\n'));
  
  // Sort sessions by longest sequence duration
  const sortedAnalyses = [...analyses].sort((a, b) => {
    const aDuration = a.longestSequence?.durationMs || 0;
    const bDuration = b.longestSequence?.durationMs || 0;
    return bDuration - aDuration;
  });
  
  // Overall statistics
  const allSequences = analyses.flatMap(a => a.sequences);
  const totalSequences = allSequences.length;
  const longestOverall = allSequences.reduce((longest, current) => 
    !longest || current.durationMs > longest.durationMs ? current : longest
  , null as any);
  
  console.log(chalk.yellow.bold('Overall Statistics:'));
  console.log(`  Total Response Sequences: ${chalk.white.bold(totalSequences)}`);
  console.log(`  Sessions Analyzed: ${chalk.white.bold(analyses.length)}`);
  if (longestOverall) {
    console.log(`  Longest Sequence Overall: ${chalk.white.bold(formatDuration(longestOverall.durationMs))}`);
  }
  console.log('');
  
  // Time distribution across all sessions
  console.log(chalk.yellow.bold('Time Distribution (All Sessions):'));
  const totalDistribution = {
    '0-10s': 0,
    '10-30s': 0,
    '30-60s': 0,
    '1-5m': 0,
    '5m+': 0
  };
  
  analyses.forEach(analysis => {
    Object.entries(analysis.timeDistribution).forEach(([range, count]) => {
      totalDistribution[range as keyof typeof totalDistribution] += count;
    });
  });
  
  console.log(chalk.gray('─'.repeat(40)));
  Object.entries(totalDistribution).forEach(([range, count]) => {
    const percentage = totalSequences > 0 ? (count / totalSequences * 100).toFixed(1) : '0';
    const bar = '█'.repeat(Math.floor(Number(percentage) / 2));
    console.log(`  ${chalk.cyan(range.padEnd(8))} ${chalk.white(count.toString().padStart(4))} ${chalk.gray(`(${percentage}%)`)} ${chalk.blue(bar)}`);
  });
  console.log(chalk.gray('─'.repeat(40)));
  
  // Per-session analysis
  console.log('\n' + chalk.yellow.bold('Session Analysis (Sorted by Longest Sequence):'));
  console.log(chalk.gray('═'.repeat(80)));
  
  sortedAnalyses.forEach((analysis, index) => {
    const sessionName = analysis.sessionId.substring(0, 8) + '...';
    const projectName = analysis.projectPath.split('/').pop() || 'Unknown';
    
    console.log(`\n${chalk.cyan.bold(`${index + 1}. Session:`)} ${chalk.white(sessionName)} ${chalk.gray(`(${projectName})`)}`);
    console.log(`   ${chalk.dim('Total Sequences:')} ${analysis.sequences.length}`);
    
    if (analysis.longestSequence) {
      const seq = analysis.longestSequence;
      console.log(`\n   ${chalk.yellow('Longest Sequence:')}`);
      console.log(`     ${chalk.dim('Response Time:')} ${chalk.white.bold(formatDuration(seq.responseTimeMs))} ${chalk.dim('(user → first assistant)')}`);
      console.log(`     ${chalk.dim('Processing Time:')} ${chalk.white.bold(formatDuration(seq.durationMs))} ${chalk.dim('(first → last assistant)')}`);
      const displayMessage = seq.userMessage || '[No message text]';
      const truncatedMessage = displayMessage.length > 80 
        ? displayMessage.substring(0, 77) + '...' 
        : displayMessage;
      console.log(`   ${chalk.dim('User Query:')} "${chalk.italic(truncatedMessage)}"`);
      console.log(`   ${chalk.dim('Messages:')} ${seq.messageCount} ${chalk.dim('| Tool Uses:')} ${seq.toolUseCount}`);
      console.log(`   ${chalk.dim('Started:')} ${new Date(seq.firstAssistantTimestamp).toLocaleTimeString()}`);
      console.log(`   ${chalk.dim('Ended:')} ${new Date(seq.lastAssistantTimestamp).toLocaleTimeString()}`);
    }
    
    // Session time distribution
    console.log(`\n   ${chalk.dim('Time Distribution:')}`);
    Object.entries(analysis.timeDistribution).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`     ${range.padEnd(8)} ${chalk.white(count.toString().padStart(3))} sequences`);
      }
    });
    
    // Top 3 longest sequences
    if (analysis.sequences.length > 1) {
      console.log(`\n   ${chalk.dim('Top 3 Longest Sequences:')}`);
      const topSequences = [...analysis.sequences]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 3);
      
      topSequences.forEach((seq, i) => {
        const msg = seq.userMessage || '[No message]';
        const truncMsg = msg.length > 50 ? msg.substring(0, 47) + '...' : msg;
        console.log(`     ${i + 1}. ${chalk.white(formatDuration(seq.durationMs))} - "${truncMsg}"`);
      });
    }
    
    console.log(chalk.gray('─'.repeat(80)));
  });
  
  console.log('\n' + chalk.dim('Press Ctrl+C to exit\n'));
}