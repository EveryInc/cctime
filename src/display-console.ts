import { ProcessedData, DailyResponseTime } from './types/index.js';
import chalk from 'chalk';

export function displayConsoleReport(data: ProcessedData): void {
  console.clear();
  
  // Header
  console.log(chalk.cyan.bold('\n📊 Claude Response Time Analytics\n'));
  
  // Summary Statistics
  console.log(chalk.yellow.bold('Summary Statistics:'));
  console.log(`  Total Responses: ${chalk.white.bold(data.summary.totalResponses)}`);
  console.log(`  Average Response Time: ${chalk.white.bold(formatTime(data.summary.averageResponseTimeMs))}`);
  console.log(`  Total Time: ${chalk.white.bold(formatTime(data.summary.totalResponseTimeMs))}`);
  console.log(`  Unique Sessions: ${chalk.white.bold(data.summary.uniqueSessions)}`);
  console.log(`  Date Range: ${chalk.white(formatDate(data.summary.dateRange.from))} to ${chalk.white(formatDate(data.summary.dateRange.to))}`);
  console.log('');
  
  // Daily Metrics Table
  console.log(chalk.yellow.bold('Daily Metrics:'));
  console.log(chalk.gray('─'.repeat(80)));
  
  // Table header
  console.log(
    chalk.cyan(pad('Date', 12)) + 
    chalk.cyan(pad('Responses', 12)) + 
    chalk.cyan(pad('Avg Time', 12)) + 
    chalk.cyan(pad('Total Time', 12)) + 
    chalk.cyan(pad('Sessions', 10)) +
    chalk.cyan(pad('P50', 10)) +
    chalk.cyan(pad('P90', 10)) +
    chalk.cyan(pad('P99', 10))
  );
  console.log(chalk.gray('─'.repeat(80)));
  
  // Table rows
  const dailyData = Array.from(data.daily.entries())
    .sort(([a], [b]) => b.localeCompare(a)); // Sort by date descending
  
  for (const [date, metrics] of dailyData) {
    console.log(
      pad(formatDate(date), 12) +
      pad(metrics.responseCount.toString(), 12) +
      pad(formatTime(metrics.averageResponseTimeMs), 12) +
      pad(formatTime(metrics.totalResponseTimeMs), 12) +
      pad(metrics.sessions.size.toString(), 10) +
      pad(formatTime(metrics.percentiles.p50), 10) +
      pad(formatTime(metrics.percentiles.p90), 10) +
      pad(formatTime(metrics.percentiles.p99), 10)
    );
  }
  console.log(chalk.gray('─'.repeat(80)));
  
  // Top Sessions
  console.log('\n' + chalk.yellow.bold('Top Sessions by Response Time:'));
  console.log(chalk.gray('─'.repeat(60)));
  
  const topSessions = Array.from(data.sessions.values())
    .sort((a, b) => b.totalResponseTimeMs - a.totalResponseTimeMs)
    .slice(0, 5);
  
  for (const session of topSessions) {
    const projectName = session.projectPath.split('/').pop() || 'Unknown';
    console.log(
      chalk.dim(`  ${session.sessionId.substring(0, 8)}...`) +
      chalk.white(` ${projectName}`) +
      chalk.gray(` - ${session.totalResponses} responses, `) +
      chalk.white(formatTime(session.averageResponseTimeMs) + ' avg')
    );
  }
  
  console.log('\n' + chalk.dim('Press Ctrl+C to exit\n'));
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function pad(str: string, length: number): string {
  return str.padEnd(length);
}