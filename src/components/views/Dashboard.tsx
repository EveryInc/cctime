import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';
import { 
  BaseTable, 
  BaseChart, 
  BaseProgressBar, 
  BaseKeyboardHints,
  commonHints 
} from '../base/index.js';
import {
  useAppState,
  useAppDispatch,
  useDataLoader,
  useKeyboardNavigation,
  useSelection,
  useSorting,
  usePagination,
  useAutoRefresh,
  actions
} from '../../state/index.js';
import type { DailyResponseTime } from '../../types/index.js';

type FocusArea = 'table' | 'chart';

export function Dashboard() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { isLoading, error, reload } = useDataLoader();
  const [focusArea, setFocusArea] = useState<FocusArea>('table');
  
  // Convert Map to array for processing
  const dailyData = useMemo(() => {
    if (!state.data?.daily) return [];
    return Array.from(state.data.daily.values());
  }, [state.data?.daily]);
  
  // Sorting
  const { sortedItems, sortBy, sortOrder, changeSortBy } = useSorting(
    dailyData,
    'date',
    'desc'
  );
  
  // Pagination
  const { 
    paginatedItems, 
    currentPage, 
    totalPages, 
    nextPage, 
    previousPage,
    hasNextPage,
    hasPreviousPage 
  } = usePagination(sortedItems, 10);
  
  // Selection
  const { 
    selectedIndex, 
    selectNext, 
    selectPrevious, 
    selectFirst, 
    selectLast 
  } = useSelection(paginatedItems);
  
  // Auto-refresh every 30 seconds when enabled
  useAutoRefresh(reload, 30000, state.settings.watchMode);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    return sortedItems
      .slice(-30) // Last 30 days
      .map(item => ({
        date: item.date,
        value: Math.round(item.averageResponseTimeMs)
      }))
      .reverse(); // Chronological order for chart
  }, [sortedItems]);
  
  // Keyboard navigation
  useKeyboardNavigation({
    onUp: () => {
      if (focusArea === 'table') {
        selectPrevious();
      }
    },
    onDown: () => {
      if (focusArea === 'table') {
        selectNext();
      }
    },
    onLeft: () => {
      if (focusArea === 'table' && hasPreviousPage) {
        previousPage();
      }
    },
    onRight: () => {
      if (focusArea === 'table' && hasNextPage) {
        nextPage();
      }
    },
    onTab: () => {
      setFocusArea(focusArea === 'table' ? 'chart' : 'table');
    },
    onEnter: () => {
      if (focusArea === 'table' && paginatedItems[selectedIndex]) {
        const selectedItem = paginatedItems[selectedIndex];
        dispatch(actions.selectDate(selectedItem.date));
        dispatch(actions.setView('details'));
      }
    },
    onEscape: () => {
      // Could be used to exit or go back
      process.exit(0);
    },
    customHandlers: {
      'r': reload,
      'R': reload,
      's': () => {
        // Cycle through sort options
        const sortOptions: Array<'date' | 'totalTime' | 'avgTime' | 'count'> = 
          ['date', 'totalTime', 'avgTime', 'count'];
        const currentIndex = sortOptions.indexOf(sortBy as any);
        const nextIndex = (currentIndex + 1) % sortOptions.length;
        changeSortBy(nextIndex === 1 ? 'totalResponseTimeMs' : 
                     nextIndex === 2 ? 'averageResponseTimeMs' : 
                     nextIndex === 3 ? 'responseCount' : 
                     'date' as any);
      },
      'e': () => {
        dispatch(actions.setView('export'));
      },
      'h': () => {
        selectFirst();
      },
      'l': () => {
        selectLast();
      }
    }
  });
  
  // Loading state
  if (state.loading && !state.data) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Loading Claude Response Times...</Text>
        <Box marginTop={1}>
          <BaseProgressBar progress={0.5} width={40} />
        </Box>
      </Box>
    );
  }
  
  // Error state
  if (state.error && !state.data) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error loading data:</Text>
        <Text color="red">{state.error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press 'r' to retry</Text>
        </Box>
      </Box>
    );
  }
  
  // Empty state
  if (!state.data || dailyData.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No response time data found.</Text>
        <Text dimColor>Make sure you have Claude session files in your home directory.</Text>
      </Box>
    );
  }
  
  // Summary statistics
  const { summary } = state.data;
  
  // Table columns
  const columns = [
    { key: 'date', header: 'Date', width: 12 },
    { key: 'responseCount', header: 'Responses', width: 10 },
    { key: 'averageResponseTimeMs', header: 'Avg Time', width: 10 },
    { key: 'totalResponseTimeMs', header: 'Total Time', width: 12 },
    { key: 'sessions', header: 'Sessions', width: 10 }
  ];
  
  // Format table data
  const tableData = paginatedItems.map((item, index) => ({
    date: item.date,
    responseCount: item.responseCount.toString(),
    averageResponseTimeMs: `${Math.round(item.averageResponseTimeMs)}ms`,
    totalResponseTimeMs: `${Math.round(item.totalResponseTimeMs / 1000)}s`,
    sessions: item.sessions.size.toString(),
    isSelected: index === selectedIndex && focusArea === 'table'
  }));
  
  // Keyboard hints based on focus area
  const keyboardHints = [
    ...(focusArea === 'table' ? [
      ...commonHints.navigation,
      { key: '←/→', description: 'Page navigation' },
      { key: 'Enter', description: 'View details' },
      { key: 's', description: 'Change sort' }
    ] : [
      { key: 'Tab', description: 'Switch to table' }
    ]),
    { key: 'Tab', description: focusArea === 'table' ? 'Switch to chart' : 'Switch to table' },
    { key: 'r', description: 'Refresh data' },
    { key: 'e', description: 'Export data' },
    { key: 'h/l', description: 'First/Last item' },
    { key: 'q', description: 'Quit' }
  ];
  
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Claude Response Time Analytics</Text>
      </Box>
      
      {/* Summary Statistics */}
      <Box marginBottom={1} flexDirection="column">
        <Box gap={2}>
          <Box>
            <Text dimColor>Total Responses: </Text>
            <Text bold>{summary.totalResponses}</Text>
          </Box>
          <Box>
            <Text dimColor>Avg Response Time: </Text>
            <Text bold color={summary.averageResponseTimeMs > 5000 ? 'yellow' : 'green'}>
              {Math.round(summary.averageResponseTimeMs)}ms
            </Text>
          </Box>
          <Box>
            <Text dimColor>Sessions: </Text>
            <Text bold>{summary.uniqueSessions}</Text>
          </Box>
          <Box>
            <Text dimColor>Date Range: </Text>
            <Text bold>
              {new Date(summary.dateRange.from).toLocaleDateString()} - {' '}
              {new Date(summary.dateRange.to).toLocaleDateString()}
            </Text>
          </Box>
        </Box>
      </Box>
      
      {/* Main content area */}
      <Box flexDirection="column" gap={1}>
        {/* Data Table */}
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold dimColor={focusArea !== 'table'}>
              Daily Response Times {focusArea === 'table' && '(Active)'}
            </Text>
            {totalPages > 1 && (
              <Text dimColor> - Page {currentPage + 1} of {totalPages}</Text>
            )}
          </Box>
          <BaseTable
            columns={columns}
            rows={tableData}
            showBorder={true}
            headerColor="cyan"
            selectedRowColor={focusArea === 'table' ? 'blue' : undefined}
          />
        </Box>
        
        {/* Chart */}
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold dimColor={focusArea !== 'chart'}>
              Response Time Trend (Last 30 Days) {focusArea === 'chart' && '(Active)'}
            </Text>
          </Box>
          <BaseChart
            data={chartData}
            width={60}
            height={10}
            color={focusArea === 'chart' ? 'cyan' : 'gray'}
            showAxis={true}
            showValues={true}
          />
        </Box>
      </Box>
      
      {/* Status bar */}
      <Box marginTop={1} flexDirection="column">
        {isLoading && (
          <Box>
            <Text dimColor>Refreshing data...</Text>
          </Box>
        )}
        {state.settings.watchMode && (
          <Box>
            <Text dimColor>Watch mode enabled (auto-refresh every 30s)</Text>
          </Box>
        )}
      </Box>
      
      {/* Keyboard hints */}
      <Box marginTop={1}>
        <BaseKeyboardHints hints={keyboardHints} />
      </Box>
    </Box>
  );
}