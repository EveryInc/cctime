import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { BaseTable, BaseChart, BaseProgressBar, BaseKeyboardHints, commonHints } from './index.js';
import { DailyResponseTime } from '../../types/index.js';

// Example component showcasing all base components
const BaseComponentsExample = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'totalTime' | 'avgTime' | 'count'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [progress, setProgress] = useState(0);

  // Mock data for demonstration
  const mockDailyData: DailyResponseTime[] = [
    {
      date: '2024-01-20',
      totalResponseTimeMs: 15000,
      averageResponseTimeMs: 1500,
      responseCount: 10,
      sessions: new Set(['session-1', 'session-2']),
      percentiles: { p50: 1400, p90: 1800, p99: 2200 }
    },
    {
      date: '2024-01-21',
      totalResponseTimeMs: 18000,
      averageResponseTimeMs: 1200,
      responseCount: 15,
      sessions: new Set(['session-3', 'session-4', 'session-5']),
      percentiles: { p50: 1100, p90: 1500, p99: 1900 }
    },
    {
      date: '2024-01-22',
      totalResponseTimeMs: 22000,
      averageResponseTimeMs: 1833,
      responseCount: 12,
      sessions: new Set(['session-6']),
      percentiles: { p50: 1700, p90: 2100, p99: 2500 }
    }
  ];

  const chartData = mockDailyData.map(d => ({
    date: d.date,
    value: d.averageResponseTimeMs
  }));

  // Simulate progress
  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 0;
        return p + 5;
      });
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (column: 'date' | 'totalTime' | 'avgTime' | 'count') => {
    if (column === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <Box flexDirection="column" gap={2} padding={1}>
      <Text bold color="green">Base Components Demo</Text>
      
      <Box flexDirection="column" gap={1}>
        <Text bold>1. Table Component</Text>
        <BaseTable
          data={mockDailyData}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text bold>2. Chart Component</Text>
        <BaseChart
          data={chartData}
          height={8}
          title="Average Response Time Trend"
          color="cyan"
        />
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text bold>3. Progress Bar Components</Text>
        <BaseProgressBar
          progress={progress}
          label="Processing transcripts"
          currentFile="/path/to/transcript-file.json"
          color="green"
        />
        <BaseProgressBar
          label="Loading data"
          currentFile="/very/long/path/to/some/deeply/nested/transcript/file.json"
          color="blue"
        />
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text bold>4. Keyboard Hints Component</Text>
        <BaseKeyboardHints
          hints={commonHints.table}
          title="Table Controls"
          layout="grid"
        />
        <BaseKeyboardHints
          hints={commonHints.global}
          title="Global Shortcuts"
          layout="horizontal"
          showBorder={false}
        />
      </Box>
    </Box>
  );
};

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  render(<BaseComponentsExample />);
}