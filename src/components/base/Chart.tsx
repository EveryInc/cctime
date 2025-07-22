import React from 'react';
import { Box, Text } from 'ink';
import * as asciichart from 'asciichart';

interface BaseChartProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
  title?: string;
  showLabels?: boolean;
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'magenta' | 'cyan';
}

export const BaseChart: React.FC<BaseChartProps> = ({
  data,
  height = 10,
  title,
  showLabels = true,
  color = 'green'
}) => {
  if (!data || data.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="single" padding={1}>
        {title && <Text bold>{title}</Text>}
        <Text dimColor>No data to display</Text>
      </Box>
    );
  }

  // Extract values for the chart
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Configure chart options
  const chartOptions = {
    height,
    padding: '       ',
    format: (x: number, i: number) => {
      // Format Y-axis labels
      if (x < 1000) return x.toFixed(0).padStart(6);
      return (x / 1000).toFixed(1).padStart(5) + 'k';
    }
  };

  // Generate the chart
  const chart = asciichart.plot(values, chartOptions);

  // Format dates for X-axis
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Create X-axis labels
  const xAxisLabels = () => {
    if (!showLabels || data.length < 2) return null;
    
    const startLabel = formatDateLabel(data[0].date);
    const endLabel = formatDateLabel(data[data.length - 1].date);
    const chartWidth = chart.split('\n')[0].length - 7; // Subtract Y-axis padding
    
    const padding = Math.max(0, chartWidth - startLabel.length - endLabel.length);
    return startLabel + ' '.repeat(padding) + endLabel;
  };

  // Stats display
  const stats = {
    min: minValue,
    max: maxValue,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    current: values[values.length - 1]
  };

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      
      <Box flexDirection="column">
        <Text color={color}>{chart}</Text>
        
        {showLabels && xAxisLabels() && (
          <Box marginTop={1}>
            <Text dimColor>       {xAxisLabels()}</Text>
          </Box>
        )}
        
        <Box marginTop={1} gap={2}>
          <Text dimColor>Min: <Text color="red">{stats.min.toFixed(0)}ms</Text></Text>
          <Text dimColor>Max: <Text color="green">{stats.max.toFixed(0)}ms</Text></Text>
          <Text dimColor>Avg: <Text color="yellow">{stats.avg.toFixed(0)}ms</Text></Text>
          <Text dimColor>Current: <Text color="cyan">{stats.current.toFixed(0)}ms</Text></Text>
        </Box>
      </Box>
    </Box>
  );
};