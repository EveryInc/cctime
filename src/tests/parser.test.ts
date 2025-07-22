import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { parseTranscriptLine, parseTranscriptFile, streamTranscriptFile } from '../parser/index.js';
import { calculateResponseTimes, calculateStatistics, findUnansweredMessages } from '../calculator.js';
import { TranscriptEntry } from '../types.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Parser Module', () => {
  describe('parseTranscriptLine', () => {
    test('should parse valid user message', () => {
      const line = JSON.stringify({
        type: 'user',
        message: 'Hello, Claude!',
        timestamp: '2024-01-01T10:00:00.000Z',
      });
      
      const result = parseTranscriptLine(line);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('user');
      expect(result?.message).toBe('Hello, Claude!');
      expect(result?.timestamp).toBe('2024-01-01T10:00:00.000Z');
    });
    
    test('should parse valid assistant message with usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: 'Hello! How can I help you?',
        timestamp: '2024-01-01T10:00:01.000Z',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_read_input_tokens: 5,
        },
      });
      
      const result = parseTranscriptLine(line);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('assistant');
      expect(result?.usage?.input_tokens).toBe(10);
      expect(result?.usage?.output_tokens).toBe(20);
    });
    
    test('should parse tool_result entry', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        tool: 'search',
        result: 'Found 5 results',
        timestamp: '2024-01-01T10:00:02.000Z',
      });
      
      const result = parseTranscriptLine(line);
      expect(result).toBeTruthy();
      expect(result?.type).toBe('tool_result');
      expect(result?.tool).toBe('search');
      expect(result?.result).toBe('Found 5 results');
    });
    
    test('should return null for empty lines', () => {
      expect(parseTranscriptLine('')).toBeNull();
      expect(parseTranscriptLine('  ')).toBeNull();
      expect(parseTranscriptLine('\n')).toBeNull();
    });
    
    test('should return null for malformed JSON', () => {
      expect(parseTranscriptLine('not json')).toBeNull();
      expect(parseTranscriptLine('{"incomplete":')).toBeNull();
      expect(parseTranscriptLine('{invalid json}')).toBeNull();
    });
    
    test('should return null for missing required fields', () => {
      expect(parseTranscriptLine(JSON.stringify({ message: 'test' }))).toBeNull();
      expect(parseTranscriptLine(JSON.stringify({ type: 'user' }))).toBeNull();
    });
    
    test('should return null for invalid types', () => {
      const line = JSON.stringify({
        type: 'invalid_type',
        timestamp: '2024-01-01T10:00:00.000Z',
      });
      expect(parseTranscriptLine(line)).toBeNull();
    });
  });
  
  describe('parseTranscriptFile', () => {
    let testFile: string;
    
    beforeEach(() => {
      testFile = join(tmpdir(), `test-transcript-${Date.now()}.jsonl`);
    });
    
    afterEach(async () => {
      try {
        await unlink(testFile);
      } catch {
        // Ignore if file doesn't exist
      }
    });
    
    test('should parse file with multiple entries', async () => {
      const content = [
        JSON.stringify({ type: 'user', message: 'Hello', timestamp: '2024-01-01T10:00:00.000Z' }),
        JSON.stringify({ type: 'assistant', message: 'Hi!', timestamp: '2024-01-01T10:00:01.000Z' }),
        JSON.stringify({ type: 'user', message: 'How are you?', timestamp: '2024-01-01T10:00:02.000Z' }),
      ].join('\n');
      
      await writeFile(testFile, content);
      const entries = await parseTranscriptFile(testFile);
      
      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe('user');
      expect(entries[1].type).toBe('assistant');
      expect(entries[2].type).toBe('user');
    });
    
    test('should skip invalid lines', async () => {
      const content = [
        JSON.stringify({ type: 'user', message: 'Valid', timestamp: '2024-01-01T10:00:00.000Z' }),
        'invalid json',
        '',
        JSON.stringify({ type: 'assistant', message: 'Also valid', timestamp: '2024-01-01T10:00:01.000Z' }),
      ].join('\n');
      
      await writeFile(testFile, content);
      const entries = await parseTranscriptFile(testFile);
      
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('Valid');
      expect(entries[1].message).toBe('Also valid');
    });
    
    test('should handle empty file', async () => {
      await writeFile(testFile, '');
      const entries = await parseTranscriptFile(testFile);
      expect(entries).toHaveLength(0);
    });
    
    test('should throw error for non-existent file', async () => {
      await expect(parseTranscriptFile('/non/existent/file.jsonl')).rejects.toThrow();
    });
  });
  
  describe('streamTranscriptFile', () => {
    let testFile: string;
    
    beforeEach(() => {
      testFile = join(tmpdir(), `test-stream-${Date.now()}.jsonl`);
    });
    
    afterEach(async () => {
      try {
        await unlink(testFile);
      } catch {
        // Ignore if file doesn't exist
      }
    });
    
    test('should stream entries one by one', async () => {
      const content = [
        JSON.stringify({ type: 'user', message: 'First', timestamp: '2024-01-01T10:00:00.000Z' }),
        JSON.stringify({ type: 'assistant', message: 'Second', timestamp: '2024-01-01T10:00:01.000Z' }),
        JSON.stringify({ type: 'user', message: 'Third', timestamp: '2024-01-01T10:00:02.000Z' }),
      ].join('\n');
      
      await writeFile(testFile, content);
      
      const entries: TranscriptEntry[] = [];
      await streamTranscriptFile(testFile, (entry) => {
        entries.push(entry);
      });
      
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('First');
      expect(entries[1].message).toBe('Second');
      expect(entries[2].message).toBe('Third');
    });
    
    test('should handle large files efficiently', async () => {
      // Create a file with many entries
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(JSON.stringify({
          type: i % 2 === 0 ? 'user' : 'assistant',
          message: `Message ${i}`,
          timestamp: new Date(2024, 0, 1, 10, 0, i).toISOString(),
        }));
      }
      
      await writeFile(testFile, lines.join('\n'));
      
      let count = 0;
      await streamTranscriptFile(testFile, () => {
        count++;
      });
      
      expect(count).toBe(1000);
    });
  });
});

describe('Calculator Module', () => {
  describe('calculateResponseTimes', () => {
    test('should calculate response times for user-assistant pairs', () => {
      const entries: TranscriptEntry[] = [
        { type: 'user', message: 'Hello', timestamp: '2024-01-01T10:00:00.000Z' },
        { type: 'assistant', message: 'Hi!', timestamp: '2024-01-01T10:00:01.500Z' },
        { type: 'user', message: 'How are you?', timestamp: '2024-01-01T10:00:05.000Z' },
        { type: 'assistant', message: 'I am fine!', timestamp: '2024-01-01T10:00:06.200Z' },
      ];
      
      const responseTimes = calculateResponseTimes(entries, 'session-1', '/project');
      
      expect(responseTimes).toHaveLength(2);
      expect(responseTimes[0].responseTimeMs).toBe(1500);
      expect(responseTimes[1].responseTimeMs).toBe(1200);
      expect(responseTimes[0].sessionId).toBe('session-1');
      expect(responseTimes[0].projectPath).toBe('/project');
    });
    
    test('should handle interruptions', () => {
      const entries: TranscriptEntry[] = [
        { type: 'user', message: 'First question', timestamp: '2024-01-01T10:00:00.000Z' },
        { type: 'user', message: 'Second question', timestamp: '2024-01-01T10:00:02.000Z' },
        { type: 'assistant', message: 'Answer', timestamp: '2024-01-01T10:00:03.000Z' },
      ];
      
      const responseTimes = calculateResponseTimes(entries, 'session-1', '/project');
      
      expect(responseTimes).toHaveLength(1);
      expect(responseTimes[0].userMessageTimestamp).toBe('2024-01-01T10:00:02.000Z');
    });
    
    test('should ignore negative response times', () => {
      const entries: TranscriptEntry[] = [
        { type: 'assistant', message: 'Early response', timestamp: '2024-01-01T10:00:00.000Z' },
        { type: 'user', message: 'Late question', timestamp: '2024-01-01T10:00:01.000Z' },
      ];
      
      const responseTimes = calculateResponseTimes(entries, 'session-1', '/project');
      expect(responseTimes).toHaveLength(0);
    });
  });
  
  describe('calculateStatistics', () => {
    test('should calculate correct statistics', () => {
      const responseTimes = [
        { responseTimeMs: 1000, userMessageTimestamp: '', assistantMessageTimestamp: '', sessionId: '', projectPath: '' },
        { responseTimeMs: 2000, userMessageTimestamp: '', assistantMessageTimestamp: '', sessionId: '', projectPath: '' },
        { responseTimeMs: 3000, userMessageTimestamp: '', assistantMessageTimestamp: '', sessionId: '', projectPath: '' },
        { responseTimeMs: 4000, userMessageTimestamp: '', assistantMessageTimestamp: '', sessionId: '', projectPath: '' },
        { responseTimeMs: 5000, userMessageTimestamp: '', assistantMessageTimestamp: '', sessionId: '', projectPath: '' },
      ];
      
      const stats = calculateStatistics(responseTimes);
      
      expect(stats.average).toBe(3000);
      expect(stats.median).toBe(3000);
      expect(stats.min).toBe(1000);
      expect(stats.max).toBe(5000);
      expect(stats.count).toBe(5);
    });
    
    test('should handle empty array', () => {
      const stats = calculateStatistics([]);
      
      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.count).toBe(0);
    });
  });
  
  describe('findUnansweredMessages', () => {
    test('should identify unanswered messages', () => {
      const entries: TranscriptEntry[] = [
        { type: 'user', message: 'Question 1', timestamp: '2024-01-01T10:00:00.000Z' },
        { type: 'assistant', message: 'Answer 1', timestamp: '2024-01-01T10:00:01.000Z' },
        { type: 'user', message: 'Question 2', timestamp: '2024-01-01T10:00:02.000Z' },
        { type: 'user', message: 'Question 3', timestamp: '2024-01-01T10:00:03.000Z' },
        { type: 'assistant', message: 'Answer 3', timestamp: '2024-01-01T10:00:04.000Z' },
        { type: 'user', message: 'Question 4', timestamp: '2024-01-01T10:00:05.000Z' },
      ];
      
      const unanswered = findUnansweredMessages(entries);
      
      expect(unanswered).toHaveLength(2);
      expect(unanswered[0]).toBe('2024-01-01T10:00:02.000Z');
      expect(unanswered[1]).toBe('2024-01-01T10:00:05.000Z');
    });
  });
});