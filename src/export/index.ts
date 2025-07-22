import * as fs from 'fs/promises';
import * as path from 'path';
import { ProcessedData, DailyResponseTime, SessionMetrics, SummaryStatistics } from '../types.js';

// Export format interfaces
interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'markdown';
  outputPath?: string;
  includeStats?: boolean;
  toClipboard?: boolean;
}

// Helper function to format dates
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Helper function to format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Convert ProcessedData to a serializable format
function toSerializable(data: ProcessedData): any {
  const daily = Array.from(data.daily.entries()).map(([date, metrics]) => ({
    date,
    totalResponseTimeMs: metrics.totalResponseTimeMs,
    averageResponseTimeMs: metrics.averageResponseTimeMs,
    responseCount: metrics.responseCount,
    sessionCount: metrics.sessions.size,
    sessions: Array.from(metrics.sessions),
    percentiles: metrics.percentiles
  }));

  const sessions = Array.from(data.sessions.entries()).map(([id, session]) => ({
    sessionId: session.sessionId,
    projectPath: session.projectPath,
    totalResponses: session.totalResponses,
    totalResponseTimeMs: session.totalResponseTimeMs,
    averageResponseTimeMs: session.averageResponseTimeMs,
    firstMessage: session.firstMessage,
    lastMessage: session.lastMessage
  }));

  return {
    summary: data.summary,
    daily,
    sessions
  };
}

// Export as JSON
async function exportJSON(data: ProcessedData, outputPath: string, includeStats: boolean): Promise<ExportResult> {
  try {
    const exportData = toSerializable(data);
    
    if (!includeStats) {
      delete exportData.sessions;
    }

    const jsonContent = JSON.stringify(exportData, null, 2);
    await fs.writeFile(outputPath, jsonContent, 'utf-8');

    return { success: true, filePath: outputPath };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during JSON export' 
    };
  }
}

// Export as CSV
async function exportCSV(data: ProcessedData, outputPath: string, includeStats: boolean): Promise<ExportResult> {
  try {
    const headers = [
      'Date',
      'Total Response Time (ms)',
      'Average Response Time (ms)',
      'Response Count',
      'Session Count',
      'P50 (ms)',
      'P90 (ms)',
      'P99 (ms)'
    ];

    const rows: string[] = [headers.join(',')];

    // Add daily data
    const dailyData = Array.from(data.daily.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [date, metrics] of dailyData) {
      const row = [
        date,
        metrics.totalResponseTimeMs.toString(),
        metrics.averageResponseTimeMs.toFixed(2),
        metrics.responseCount.toString(),
        metrics.sessions.size.toString(),
        metrics.percentiles.p50.toFixed(2),
        metrics.percentiles.p90.toFixed(2),
        metrics.percentiles.p99.toFixed(2)
      ];
      rows.push(row.map(cell => `"${cell}"`).join(','));
    }

    // Add summary statistics if requested
    if (includeStats) {
      rows.push('');
      rows.push('Summary Statistics');
      rows.push(`Total Response Time,${data.summary.totalResponseTimeMs}`);
      rows.push(`Total Responses,${data.summary.totalResponses}`);
      rows.push(`Average Response Time,${data.summary.averageResponseTimeMs.toFixed(2)}`);
      rows.push(`Unique Sessions,${data.summary.uniqueSessions}`);
      rows.push(`Date Range,"${data.summary.dateRange.from} to ${data.summary.dateRange.to}"`);
    }

    const csvContent = rows.join('\n');
    await fs.writeFile(outputPath, csvContent, 'utf-8');

    return { success: true, filePath: outputPath };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during CSV export' 
    };
  }
}

// Export as Markdown
async function exportMarkdown(data: ProcessedData, outputPath: string, includeStats: boolean): Promise<ExportResult> {
  try {
    const lines: string[] = ['# Claude Code Response Time Analysis'];
    
    // Add summary section
    lines.push('');
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **Total Response Time**: ${formatDuration(data.summary.totalResponseTimeMs)}`);
    lines.push(`- **Total Responses**: ${data.summary.totalResponses}`);
    lines.push(`- **Average Response Time**: ${formatDuration(data.summary.averageResponseTimeMs)}`);
    lines.push(`- **Unique Sessions**: ${data.summary.uniqueSessions}`);
    lines.push(`- **Date Range**: ${formatDate(data.summary.dateRange.from)} to ${formatDate(data.summary.dateRange.to)}`);

    // Add daily metrics table
    lines.push('');
    lines.push('## Daily Metrics');
    lines.push('');
    lines.push('| Date | Total Time | Avg Time | Responses | Sessions | P50 | P90 | P99 |');
    lines.push('|------|------------|----------|-----------|----------|-----|-----|-----|');

    const dailyData = Array.from(data.daily.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [date, metrics] of dailyData) {
      lines.push(
        `| ${formatDate(date)} | ${formatDuration(metrics.totalResponseTimeMs)} | ${formatDuration(metrics.averageResponseTimeMs)} | ${metrics.responseCount} | ${metrics.sessions.size} | ${formatDuration(metrics.percentiles.p50)} | ${formatDuration(metrics.percentiles.p90)} | ${formatDuration(metrics.percentiles.p99)} |`
      );
    }

    // Add session details if requested
    if (includeStats && data.sessions.size > 0) {
      lines.push('');
      lines.push('## Session Details');
      lines.push('');
      lines.push('| Session ID | Project | Responses | Total Time | Avg Time |');
      lines.push('|------------|---------|-----------|------------|----------|');

      const sessions = Array.from(data.sessions.values())
        .sort((a, b) => b.totalResponseTimeMs - a.totalResponseTimeMs)
        .slice(0, 20); // Top 20 sessions

      for (const session of sessions) {
        const sessionId = session.sessionId.substring(0, 8) + '...';
        const projectName = session.projectPath.split('/').pop() || 'Unknown';
        lines.push(
          `| ${sessionId} | ${projectName} | ${session.totalResponses} | ${formatDuration(session.totalResponseTimeMs)} | ${formatDuration(session.averageResponseTimeMs)} |`
        );
      }

      if (data.sessions.size > 20) {
        lines.push('');
        lines.push(`*Showing top 20 sessions out of ${data.sessions.size} total*`);
      }
    }

    const markdownContent = lines.join('\n');
    await fs.writeFile(outputPath, markdownContent, 'utf-8');

    return { success: true, filePath: outputPath };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during Markdown export' 
    };
  }
}

// Main export function
export async function exportData(
  data: ProcessedData,
  options: ExportOptions
): Promise<ExportResult> {
  // Validate input
  if (!data || !data.daily || !data.sessions || !data.summary) {
    return { success: false, error: 'Invalid or missing data to export' };
  }

  // Handle clipboard export (requires external implementation)
  if (options.toClipboard) {
    try {
      const serialized = toSerializable(data);
      let content: string;
      
      switch (options.format) {
        case 'json':
          content = JSON.stringify(serialized, null, 2);
          break;
        case 'csv':
          // Create CSV content in memory
          const headers = ['Date', 'Total Time', 'Avg Time', 'Responses', 'Sessions'];
          const rows = [headers.join(',')];
          Array.from(data.daily.entries()).forEach(([date, metrics]) => {
            rows.push([
              date,
              metrics.totalResponseTimeMs,
              metrics.averageResponseTimeMs.toFixed(2),
              metrics.responseCount,
              metrics.sessions.size
            ].join(','));
          });
          content = rows.join('\n');
          break;
        case 'markdown':
          content = `# Response Time Summary\n\nTotal: ${formatDuration(data.summary.totalResponseTimeMs)}\nAverage: ${formatDuration(data.summary.averageResponseTimeMs)}\nResponses: ${data.summary.totalResponses}`;
          break;
        default:
          return { success: false, error: 'Unsupported format for clipboard' };
      }
      
      // Note: Actual clipboard implementation would go here
      // For now, we'll just return the content
      return { 
        success: true, 
        error: 'Clipboard export not implemented. Content prepared but not copied.' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error preparing clipboard content' 
      };
    }
  }

  // Determine output path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const defaultFilename = `cctime-export-${timestamp}`;
  
  let outputPath = options.outputPath;
  if (!outputPath) {
    const extension = options.format === 'markdown' ? 'md' : options.format;
    outputPath = path.join(process.cwd(), `${defaultFilename}.${extension}`);
  }

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to create directory: ${dir}` 
    };
  }

  // Export based on format
  const includeStats = options.includeStats ?? true;
  
  switch (options.format) {
    case 'json':
      return exportJSON(data, outputPath, includeStats);
    case 'csv':
      return exportCSV(data, outputPath, includeStats);
    case 'markdown':
      return exportMarkdown(data, outputPath, includeStats);
    default:
      return { success: false, error: `Unsupported export format: ${options.format}` };
  }
}

// Export helper for CLI usage
export async function exportToFile(
  data: ProcessedData,
  format: 'json' | 'csv' | 'markdown',
  outputPath?: string
): Promise<string> {
  const result = await exportData(data, { format, outputPath });
  
  if (!result.success) {
    throw new Error(result.error || 'Export failed');
  }
  
  return result.filePath || 'Export completed';
}