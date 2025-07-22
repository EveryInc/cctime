#!/usr/bin/env bun
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app-main.js';
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
  .option('-i, --interactive', 'Enable interactive mode (default: false)')
  .option('--config <path>', 'Path to config file', '~/.cctime/config.json')
  .option('-w, --watch', 'Watch for changes in session files')
  .option('--analyze-sequences', 'Analyze assistant response sequences')
  .option('--longest', 'Find the single longest assistant processing time')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    // Load configuration
    const config = await loadConfig(options.config);
    const configManager = new ConfigManager(config);

    if (options.export) {
      // Export mode
      console.log('Loading transcript data...');
      
      try {
        // Find session files based on options
        const finder = new SessionFinder();
        const files = await finder.find({
          projectPath: options.dir || process.cwd()
        });
        
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
    } else if (options.interactive) {
      // Interactive mode with Ink
      const app = render(
        <App 
          configManager={configManager}
          initialFile={options.file}
          initialDir={options.dir}
          outputFormat={options.output}
        />
      );
      
      await app.waitUntilExit();
    } else if (options.longest) {
      // Find longest assistant processing time
      try {
        await findLongestSequence(options.dir || process.cwd());
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    } else if (options.analyzeSequences) {
      // Analyze assistant response sequences
      console.log('Analyzing assistant response sequences...');
      
      try {
        // Find session files
        const finder = new SessionFinder();
        const files = await finder.find({
          projectPath: options.dir || process.cwd()
        });
        
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
        await findLongestSequence(options.dir || process.cwd());
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