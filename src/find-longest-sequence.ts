import chalk from 'chalk';
import { SessionFinder } from './finder.js';
import { analyzeAssistantSequences, formatDuration } from './assistant-sequence-analyzer.js';

export async function findLongestSequence(projectPath?: string): Promise<void> {
  console.log('Searching for longest assistant processing time...\n');
  
  // Find all session files
  const finder = new SessionFinder();
  const files = await finder.find({ projectPath });
  
  if (files.length === 0) {
    console.error('No transcript files found');
    return;
  }
  
  console.log(`Found ${files.length} transcript files\n`);
  
  let longestSequence: any = null;
  let longestSessionId = '';
  let longestProjectPath = '';
  
  // Analyze each session
  for (const file of files) {
    try {
      const analysis = await analyzeAssistantSequences(
        file.filePath,
        file.sessionId,
        file.projectPath
      );
      
      // Check all sequences in this session
      for (const sequence of analysis.sequences) {
        if (!longestSequence || sequence.durationMs > longestSequence.durationMs) {
          longestSequence = sequence;
          longestSessionId = file.sessionId;
          longestProjectPath = file.projectPath;
        }
      }
    } catch (error) {
      console.error(`Error analyzing ${file.filePath}:`, error.message);
    }
  }
  
  if (!longestSequence) {
    console.log('No sequences found in any session');
    return;
  }
  
  // Display the longest sequence
  console.log(chalk.cyan.bold('🏆 Longest Assistant Processing Time Found:\n'));
  
  console.log(chalk.yellow.bold(`Processing Time: ${formatDuration(longestSequence.durationMs)}`));
  console.log(chalk.dim(`(Time from first to last assistant message)\n`));
  
  console.log(`Session: ${chalk.white(longestSessionId.substring(0, 8))}...`);
  console.log(`Project: ${chalk.white(longestProjectPath.split('/').pop() || 'Unknown')}`);
  console.log(`Response Time: ${chalk.gray(formatDuration(longestSequence.responseTimeMs))} ${chalk.dim('(user → assistant)')}`);
  console.log(`Messages: ${longestSequence.messageCount} | Tool Uses: ${longestSequence.toolUseCount}`);
  console.log(`\nUser Query: "${chalk.italic(longestSequence.userMessage)}"`);
  console.log(`\nTimestamps:`);
  console.log(`  User sent: ${new Date(longestSequence.userTimestamp).toLocaleString()}`);
  console.log(`  Assistant started: ${new Date(longestSequence.firstAssistantTimestamp).toLocaleString()}`);
  console.log(`  Assistant finished: ${new Date(longestSequence.lastAssistantTimestamp).toLocaleString()}`);
}