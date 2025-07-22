import { describe, test, expect } from 'bun:test';
import { exportData, exportToFile } from '../export/index.js';
import type { ProcessedData, DailyResponseTime, SessionMetrics, SummaryStatistics } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper to create test data
function createTestData(): ProcessedData {
  const daily = new Map<string, DailyResponseTime>();
  const sessions = new Map<string, SessionMetrics>();

  // Add some daily data
  daily.set('2024-01-01', {
    date: '2024-01-01',
    totalResponseTimeMs: 15000,
    averageResponseTimeMs: 3000,
    responseCount: 5,
    sessions: new Set(['session1', 'session2']),
    percentiles: {
      p50: 2500,
      p90: 4000,
      p99: 4800
    }
  });

  daily.set('2024-01-02', {
    date: '2024-01-02',
    totalResponseTimeMs: 25000,
    averageResponseTimeMs: 2500,
    responseCount: 10,
    sessions: new Set(['session3', 'session4', 'session5']),
    percentiles: {
      p50: 2000,
      p90: 3500,
      p99: 4500
    }
  });

  // Add session data
  sessions.set('session1', {
    sessionId: 'session1',
    projectPath: '/home/user/project1',
    totalResponses: 3,
    totalResponseTimeMs: 9000,
    averageResponseTimeMs: 3000,
    firstMessage: '2024-01-01T10:00:00Z',
    lastMessage: '2024-01-01T10:30:00Z'
  });

  sessions.set('session2', {
    sessionId: 'session2',
    projectPath: '/home/user/project2',
    totalResponses: 2,
    totalResponseTimeMs: 6000,
    averageResponseTimeMs: 3000,
    firstMessage: '2024-01-01T14:00:00Z',
    lastMessage: '2024-01-01T14:15:00Z'
  });

  const summary: SummaryStatistics = {
    totalResponseTimeMs: 40000,
    totalResponses: 15,
    averageResponseTimeMs: 2666.67,
    uniqueSessions: 5,
    dateRange: {
      from: '2024-01-01',
      to: '2024-01-02'
    }
  };

  return { daily, sessions, summary };
}

describe('Export functionality', () => {
  const testData = createTestData();
  const testDir = '/tmp/cctime-test-exports';

  test('exports data as JSON with proper formatting', async () => {
    const outputPath = path.join(testDir, 'test-export.json');
    const result = await exportData(testData, {
      format: 'json',
      outputPath,
      includeStats: true
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(outputPath);

    // Read and verify the JSON content
    const content = await fs.readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.summary).toEqual(testData.summary);
    expect(parsed.daily).toHaveLength(2);
    expect(parsed.sessions).toHaveLength(2);
  });

  test('exports data as CSV with headers', async () => {
    const outputPath = path.join(testDir, 'test-export.csv');
    const result = await exportData(testData, {
      format: 'csv',
      outputPath,
      includeStats: true
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(outputPath);

    // Read and verify CSV content
    const content = await fs.readFile(outputPath, 'utf-8');
    const lines = content.split('\n');

    // Check headers
    expect(lines[0]).toContain('Date,Total Response Time (ms),Average Response Time (ms)');
    
    // Check data rows
    expect(lines.length).toBeGreaterThan(3); // Headers + at least 2 data rows + summary
    expect(lines[1]).toContain('2024-01-01');
    expect(lines[2]).toContain('2024-01-02');
  });

  test('exports data as Markdown with tables', async () => {
    const outputPath = path.join(testDir, 'test-export.md');
    const result = await exportData(testData, {
      format: 'markdown',
      outputPath,
      includeStats: true
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(outputPath);

    // Read and verify Markdown content
    const content = await fs.readFile(outputPath, 'utf-8');

    // Check for expected sections
    expect(content).toContain('# Claude Code Response Time Analysis');
    expect(content).toContain('## Summary Statistics');
    expect(content).toContain('## Daily Metrics');
    expect(content).toContain('| Date | Total Time | Avg Time |');
    
    // Check for data
    expect(content).toContain('2024-01-01');
    expect(content).toContain('2024-01-02');
  });

  test('handles missing data gracefully', async () => {
    const result = await exportData(null as any, {
      format: 'json'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or missing data');
  });

  test('creates directory if it does not exist', async () => {
    const nestedPath = path.join(testDir, 'nested', 'dir', 'export.json');
    const result = await exportData(testData, {
      format: 'json',
      outputPath: nestedPath
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(nestedPath);

    // Verify file exists
    const stats = await fs.stat(nestedPath);
    expect(stats.isFile()).toBe(true);
  });

  test('generates default filename with timestamp', async () => {
    const result = await exportData(testData, {
      format: 'json'
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toContain('cctime-export-');
    expect(result.filePath).toEndWith('.json');
  });

  test('exportToFile wrapper throws on error', async () => {
    expect(async () => {
      await exportToFile(null as any, 'json');
    }).toThrow();
  });

  // Clean up test files after tests
  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});