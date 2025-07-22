import chalk from 'chalk';
import { SessionFinder } from './finder.js';
import { analyzeAssistantSequences, formatDuration } from './assistant-sequence-analyzer.js';
import { promises as fs } from 'fs';
import path from 'path';
import gradient from 'gradient-string';
import figlet from 'figlet';

interface FindLongestOptions {
  file?: string;
  dir?: string;
}

export async function findLongestSequence(options: FindLongestOptions = {}): Promise<void> {
  process.stdout.write('Loading...');
  
  let files = [];
  let totalSequences = 0;
  
  if (options.file) {
    // Direct file analysis
    const stat = await fs.stat(options.file);
    if (!stat.isFile() || !options.file.endsWith('.jsonl')) {
      process.stdout.write('\r\x1b[K');
      console.error('Invalid file: must be a .jsonl file');
      return;
    }
    
    const sessionId = path.basename(options.file, '.jsonl');
    files = [{
      sessionId,
      projectPath: path.dirname(options.file),
      filePath: options.file,
      lastModified: stat.mtime,
      size: stat.size
    }];
  } else if (options.dir) {
    // Directory analysis
    const dirStat = await fs.stat(options.dir);
    if (!dirStat.isDirectory()) {
      process.stdout.write('\r\x1b[K');
      console.error('Invalid directory');
      return;
    }
    
    const dirFiles = await fs.readdir(options.dir);
    const jsonlFiles = dirFiles.filter(f => f.endsWith('.jsonl'));
    
    for (const file of jsonlFiles) {
      const filePath = path.join(options.dir, file);
      const fileStat = await fs.stat(filePath);
      const sessionId = file.replace('.jsonl', '');
      
      files.push({
        sessionId,
        projectPath: options.dir,
        filePath,
        lastModified: fileStat.mtime,
        size: fileStat.size
      });
    }
    
    if (files.length === 0) {
      process.stdout.write('\r\x1b[K');
      console.error('No .jsonl files found in directory');
      return;
    }
  } else {
    // Default: search all projects
    const finder = new SessionFinder();
    files = await finder.find({});
    
    if (files.length === 0) {
      process.stdout.write('\r\x1b[K');
      console.error('No transcript files found');
      return;
    }
  }
  
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
      
      // Count total sequences
      totalSequences += analysis.sequences.length;
      
      // Check all sequences in this session
      for (const sequence of analysis.sequences) {
        if (!longestSequence || sequence.durationMs > longestSequence.durationMs) {
          longestSequence = sequence;
          longestSessionId = file.sessionId;
          longestProjectPath = file.projectPath;
        }
      }
    } catch (error) {
      // Silently skip files with errors
    }
  }
  
  if (!longestSequence) {
    process.stdout.write('\r\x1b[K');
    console.log('No sequences found in any session');
    return;
  }
  
  // Clear the entire terminal
  console.clear();
  
  // Display the longest sequence as highscore
  console.log(chalk.cyan.bold(`🏆 Claude agentic highscore: ${chalk.yellow.bold(formatDuration(longestSequence.durationMs))} (best from ${totalSequences} total sessions)`));
  console.log(chalk.gray('\nTry it yourself with: npx claude-highscore@latest'));
  console.log(chalk.gray('\nBrought to you by'));
  
  // Display fancy EVERY text with letter spacing
  const everyText = figlet.textSync('EVERY', {
    font: 'Big',
    horizontalLayout: 'fitted', // Moderate spacing between letters
    verticalLayout: 'default'
  });
  
  // No gradient, just plain text
  console.log('\n' + everyText);
  console.log(chalk.gray('@every'));
}