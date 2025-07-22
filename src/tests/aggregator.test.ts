import { describe, test, expect } from 'bun:test';
import {
  aggregateResponseTimes,
  formatDateToDay,
  calculatePercentile,
  formatTime,
  filterByDateRange,
  getTopSessions,
  getSessionsForDate
} from '../aggregator.js';
import { ResponseTime } from '../types.js';

describe('aggregator', () => {
  const mockResponseTimes: ResponseTime[] = [
    {
      userMessageTimestamp: '2024-01-01T10:00:00.000Z',
      assistantMessageTimestamp: '2024-01-01T10:00:01.500Z',
      responseTimeMs: 1500,
      sessionId: 'session1',
      projectPath: '/project1'
    },
    {
      userMessageTimestamp: '2024-01-01T11:00:00.000Z',
      assistantMessageTimestamp: '2024-01-01T11:00:02.000Z',
      responseTimeMs: 2000,
      sessionId: 'session1',
      projectPath: '/project1'
    },
    {
      userMessageTimestamp: '2024-01-01T12:00:00.000Z',
      assistantMessageTimestamp: '2024-01-01T12:00:00.800Z',
      responseTimeMs: 800,
      sessionId: 'session2',
      projectPath: '/project1'
    },
    {
      userMessageTimestamp: '2024-01-02T09:00:00.000Z',
      assistantMessageTimestamp: '2024-01-02T09:00:03.000Z',
      responseTimeMs: 3000,
      sessionId: 'session3',
      projectPath: '/project2'
    },
    {
      userMessageTimestamp: '2024-01-02T10:00:00.000Z',
      assistantMessageTimestamp: '2024-01-02T10:00:01.200Z',
      responseTimeMs: 1200,
      sessionId: 'session3',
      projectPath: '/project2'
    }
  ];

  describe('formatDateToDay', () => {
    test('formats date to YYYY-MM-DD', () => {
      expect(formatDateToDay('2024-01-01T10:30:45.000Z')).toBe('2024-01-01');
      expect(formatDateToDay('2024-12-31T23:59:59.999Z')).toBe('2024-12-31');
    });
  });

  describe('calculatePercentile', () => {
    test('calculates percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(calculatePercentile(values, 50)).toBe(5);
      expect(calculatePercentile(values, 90)).toBe(9);
      expect(calculatePercentile(values, 100)).toBe(10);
    });

    test('handles empty array', () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });

    test('handles single value', () => {
      expect(calculatePercentile([42], 50)).toBe(42);
    });
  });

  describe('formatTime', () => {
    test('formats milliseconds correctly', () => {
      expect(formatTime(500)).toBe('500ms');
      expect(formatTime(1500)).toBe('1.5s');
      expect(formatTime(65000)).toBe('1m 5s');
      expect(formatTime(3665000)).toBe('1h 1m');
    });
  });

  describe('aggregateResponseTimes', () => {
    test('aggregates data correctly', () => {
      const result = aggregateResponseTimes(mockResponseTimes);

      // Check daily data
      expect(result.daily.size).toBe(2);
      
      const day1 = result.daily.get('2024-01-01');
      expect(day1).toBeDefined();
      expect(day1!.responseCount).toBe(3);
      expect(day1!.totalResponseTimeMs).toBe(4300);
      expect(day1!.averageResponseTimeMs).toBeCloseTo(1433.33, 2);
      expect(day1!.sessions.size).toBe(2);
      expect(day1!.percentiles.p50).toBe(1500);
      
      const day2 = result.daily.get('2024-01-02');
      expect(day2).toBeDefined();
      expect(day2!.responseCount).toBe(2);
      expect(day2!.totalResponseTimeMs).toBe(4200);
      expect(day2!.averageResponseTimeMs).toBe(2100);
      expect(day2!.sessions.size).toBe(1);

      // Check session data
      expect(result.sessions.size).toBe(3);
      
      const session1 = result.sessions.get('session1');
      expect(session1).toBeDefined();
      expect(session1!.totalResponses).toBe(2);
      expect(session1!.totalResponseTimeMs).toBe(3500);
      expect(session1!.averageResponseTimeMs).toBe(1750);
      expect(session1!.projectPath).toBe('/project1');

      // Check summary
      expect(result.summary.totalResponses).toBe(5);
      expect(result.summary.totalResponseTimeMs).toBe(8500);
      expect(result.summary.averageResponseTimeMs).toBe(1700);
      expect(result.summary.uniqueSessions).toBe(3);
      expect(result.summary.dateRange.from).toBe('2024-01-01T10:00:00.000Z');
      expect(result.summary.dateRange.to).toBe('2024-01-02T10:00:00.000Z');
    });

    test('handles empty input', () => {
      const result = aggregateResponseTimes([]);
      
      expect(result.daily.size).toBe(0);
      expect(result.sessions.size).toBe(0);
      expect(result.summary.totalResponses).toBe(0);
      expect(result.summary.totalResponseTimeMs).toBe(0);
      expect(result.summary.uniqueSessions).toBe(0);
    });
  });

  describe('filterByDateRange', () => {
    test('filters data by date range', () => {
      const data = aggregateResponseTimes(mockResponseTimes);
      const filtered = filterByDateRange(
        data,
        new Date('2024-01-02'),
        new Date('2024-01-02')
      );

      expect(filtered.daily.size).toBe(1);
      expect(filtered.daily.has('2024-01-02')).toBe(true);
      expect(filtered.sessions.size).toBe(1);
      expect(filtered.sessions.has('session3')).toBe(true);
      expect(filtered.summary.totalResponses).toBe(2);
    });
  });

  describe('getTopSessions', () => {
    test('returns top sessions by response time', () => {
      const data = aggregateResponseTimes(mockResponseTimes);
      const topSessions = getTopSessions(data.sessions, 2);

      expect(topSessions.length).toBe(2);
      expect(topSessions[0].sessionId).toBe('session3');
      expect(topSessions[0].totalResponseTimeMs).toBe(4200);
      expect(topSessions[1].sessionId).toBe('session1');
      expect(topSessions[1].totalResponseTimeMs).toBe(3500);
    });
  });

  describe('getSessionsForDate', () => {
    test('returns sessions for specific date', () => {
      const data = aggregateResponseTimes(mockResponseTimes);
      const sessions = getSessionsForDate(data, '2024-01-01');

      expect(sessions.length).toBe(2);
      const sessionIds = sessions.map(s => s.sessionId);
      expect(sessionIds).toContain('session1');
      expect(sessionIds).toContain('session2');
    });

    test('returns empty array for non-existent date', () => {
      const data = aggregateResponseTimes(mockResponseTimes);
      const sessions = getSessionsForDate(data, '2024-01-03');

      expect(sessions.length).toBe(0);
    });
  });
});