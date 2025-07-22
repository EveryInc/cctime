#!/usr/bin/env bun
import { Command } from 'commander';
import { loadConfig, ConfigManager } from './config.js';
import { version } from '../package.json';
import { exportToFile } from './export/index.js';
import { SessionFinder } from './finder.js';
import { parseTranscriptFile } from './parser/index.js';
import { calculateResponseTimes, calculateMetrics } from './calculator.js';
import { aggregateResponseTimes } from './aggregator.js';
import { processTranscript } from './parser/utils.js';
import { displayConsoleReport } from './display-console.js';
import { analyzeAssistantSequences } from './assistant-sequence-analyzer.js';
import { displaySequenceAnalysis } from './display-sequences.js';
import { findLongestSequence } from './find-longest-sequence.js';
import * as fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('cctime')
  .description('Claude Code Transcript Time Analyzer - Analyze response times from claude.ai transcripts')
  .version(version)
  .option('-f, --file <path>', 'Path to claude transcript file')
  .option('-d, --dir <path>', 'Directory containing multiple transcript files')
  .option('-o, --output <format>', 'Output format (json, csv, table)', 'table')
  .option('-e, --export <path>', 'Export results to file without interactive mode')
  .option('--export-format <format>', 'Export format for non-interactive mode (json, csv, markdown)', 'json')
  .option('--config <path>', 'Path to config file', '~/.cctime/config.json')
  .option('-w, --watch', 'Watch for changes in session files')
  .option('--analyze-sequences', 'Analyze assistant response sequences')
  .option('--longest', 'Find the single longest assistant processing time')
  .option('--debug', 'Enable debug logging for troubleshooting')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    // Set global debug flag
    global.DEBUG_MODE = options.debug || false;
    
    if (options.debug) {
      console.log('🐛 Debug mode enabled');
      console.log('🏠 Home directory:', require('os').homedir());
      console.log('📁 Expected Claude projects directory:', require('path').join(require('os').homedir(), '.claude', 'projects'));
    }
    
    // Load configuration
    const config = await loadConfig(options.config);
    const configManager = new ConfigManager(config);

    if (options.export) {
      // Export mode
      console.log('Loading transcript data...');
      
      try {
        let files = [];
        
        if (options.file) {
          // Direct file analysis
          const stat = await fs.stat(options.file);
          if (!stat.isFile() || !options.file.endsWith('.jsonl')) {
            console.error('Invalid file: must be a .jsonl file');
            process.exit(1);
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
            console.error('Invalid directory');
            process.exit(1);
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
        } else {
          // Default: search all projects
          const finder = new SessionFinder();
          files = await finder.find({});
        }
        
        if (files.length === 0) {
          console.error('No transcript files found');
          process.exit(1);
        }
        
        console.log(`Found ${files.length} transcript files`);
        
        // Parse all transcripts
        const allResponseTimes = [];
        for (const file of files) {
          try {
            const { responseTimes } = await processTranscript(
              file.filePath,
              {
                sessionId: file.sessionId,
                projectPath: file.projectPath
              }
            );
            allResponseTimes.push(...responseTimes);
          } catch (error) {
            console.error(`Error processing ${file.filePath}:`, error.message);
          }
        }
        
        if (allResponseTimes.length === 0) {
          console.error('No response times found');
          process.exit(1);
        }
        
        // Aggregate the data
        const processedData = aggregateResponseTimes(allResponseTimes);
        
        // Export to file
        const format = options.exportFormat as 'json' | 'csv' | 'markdown';
        const resultPath = await exportToFile(processedData, format, options.export);
        
        console.log(`Successfully exported to: ${resultPath}`);
        process.exit(0);
      } catch (error) {
        console.error('Export failed:', error.message);
        process.exit(1);
      }
    } else if (options.longest) {
      // Find longest assistant processing time
      try {
        await findLongestSequence({ file: options.file, dir: options.dir });
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    } else if (options.analyzeSequences) {
      // Analyze assistant response sequences
      console.log('Analyzing assistant response sequences...');
      
      try {
        let files = [];
        
        if (options.file) {
          // Direct file analysis
          const stat = await fs.stat(options.file);
          if (!stat.isFile() || !options.file.endsWith('.jsonl')) {
            console.error('Invalid file: must be a .jsonl file');
            process.exit(1);
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
            console.error('Invalid directory');
            process.exit(1);
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
        } else {
          // Default: search all projects
          const finder = new SessionFinder();
          files = await finder.find({});
        }
        
        if (files.length === 0) {
          console.error('No transcript files found');
          process.exit(1);
        }
        
        console.log(`Found ${files.length} transcript files\n`);
        
        // Analyze sequences for each session
        const analyses = [];
        for (const file of files) {
          try {
            const analysis = await analyzeAssistantSequences(
              file.filePath,
              file.sessionId,
              file.projectPath
            );
            analyses.push(analysis);
          } catch (error) {
            console.error(`Error analyzing ${file.filePath}:`, error.message);
          }
        }
        
        if (analyses.length === 0) {
          console.error('No sessions could be analyzed');
          process.exit(1);
        }
        
        // Display analysis
        displaySequenceAnalysis(analyses);
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    } else {
      // Default: Find longest assistant processing time
      try {
        await findLongestSequence({ file: options.file, dir: options.dir });
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();