import chalk from 'chalk';
import { SessionFinder } from './finder.js';
import { analyzeAssistantSequences, formatDuration } from './assistant-sequence-analyzer.js';
import { promises as fs } from 'fs';
import path from 'path';

interface FindLongestOptions {
  file?: string;
  dir?: string;
}

export async function findLongestSequence(options: FindLongestOptions = {}): Promise<void> {
  console.log('Searching for longest assistant processing time...\n');
  
  let files = [];
  
  if (options.file) {
    // Direct file analysis
    const stat = await fs.stat(options.file);
    if (!stat.isFile() || !options.file.endsWith('.jsonl')) {
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
    console.log(`Analyzing single file: ${path.basename(options.file)}\n`);
  } else if (options.dir) {
    // Directory analysis
    const dirStat = await fs.stat(options.dir);
    if (!dirStat.isDirectory()) {
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
      console.error('No .jsonl files found in directory');
      return;
    }
    
    console.log(`Found ${files.length} transcript files in directory\n`);
  } else {
    // Default: search all projects
    const finder = new SessionFinder();
    files = await finder.find({});
    
    if (files.length === 0) {
      console.error('No transcript files found');
      return;
    }
    
    console.log(`Found ${files.length} transcript files\n`);
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
  console.log(chalk.cyan.bold(`🏆 Claude operated independently for ${chalk.yellow.bold(formatDuration(longestSequence.durationMs))} straight`));
}