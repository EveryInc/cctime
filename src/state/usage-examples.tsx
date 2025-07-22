/**
 * State Management System Usage Examples
 * 
 * This file demonstrates how to use the state management system
 * with React Context, useReducer, navigation controller, and custom hooks.
 */

import React from 'react';
import { Text, Box } from 'ink';
import {
  AppProvider,
  useApp,
  useAppState,
  useAppDispatch,
  actions,
  useKeyboardNavigation,
  useSelection,
  useSorting,
  usePagination,
  useDebounce,
  useAutoRefresh,
  useNavigationController,
  useFocusManager,
  useViewTransition,
} from './index';

// Example 1: Basic state access and updates
const BasicStateExample = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // Access state
  const { data, loading, error, ui, settings } = state;

  // Dispatch actions
  const handleLoadData = () => {
    dispatch(actions.setLoading(true));
    // ... load data
    dispatch(actions.setData(/* processed data */));
  };

  const handleViewChange = () => {
    dispatch(actions.setView('details'));
  };

  return (
    <Box>
      <Text>Current View: {ui.view}</Text>
      <Text>Loading: {loading ? 'Yes' : 'No'}</Text>
    </Box>
  );
};

// Example 2: Keyboard navigation with custom handlers
const KeyboardNavigationExample = () => {
  const { state, dispatch } = useApp();
  
  useKeyboardNavigation({
    onUp: () => {
      const newIndex = Math.max(0, state.ui.selectedIndex - 1);
      dispatch(actions.setSelectedIndex(newIndex));
    },
    onDown: () => {
      // Assuming we have a max index
      const maxIndex = 10;
      const newIndex = Math.min(maxIndex, state.ui.selectedIndex + 1);
      dispatch(actions.setSelectedIndex(newIndex));
    },
    onEnter: () => {
      dispatch(actions.setView('details'));
    },
    onEscape: () => {
      dispatch(actions.setView('dashboard'));
    },
    customHandlers: {
      'r': () => {
        // Refresh data
        dispatch(actions.setLoading(true));
      },
      's': () => {
        // Open settings
        dispatch(actions.setView('settings'));
      },
    },
  });

  return (
    <Box>
      <Text>Selected Index: {state.ui.selectedIndex}</Text>
    </Box>
  );
};

// Example 3: Selection management for a list
const SelectionExample = () => {
  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
  
  const {
    selectedIndex,
    selectedItem,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
  } = useSelection(items);

  useKeyboardNavigation({
    onUp: selectPrevious,
    onDown: selectNext,
    customHandlers: {
      'g': selectFirst,
      'G': selectLast,
    },
  });

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Text
          key={index}
          color={index === selectedIndex ? 'blue' : 'white'}
          backgroundColor={index === selectedIndex ? 'white' : undefined}
        >
          {index === selectedIndex ? '> ' : '  '}{item}
        </Text>
      ))}
    </Box>
  );
};

// Example 4: Sorting data
const SortingExample = () => {
  const data = [
    { date: '2024-01-01', value: 100, count: 5 },
    { date: '2024-01-02', value: 150, count: 8 },
    { date: '2024-01-03', value: 80, count: 3 },
  ];

  const {
    sortedItems,
    sortBy,
    sortOrder,
    changeSortBy,
    toggleSortOrder,
  } = useSorting(data, 'date');

  useKeyboardNavigation({
    customHandlers: {
      's': () => {
        // Cycle through sort options
        const options = ['date', 'value', 'count'] as const;
        const currentIndex = options.indexOf(sortBy as any);
        const nextIndex = (currentIndex + 1) % options.length;
        changeSortBy(options[nextIndex] as any);
      },
      'S': toggleSortOrder,
    },
  });

  return (
    <Box flexDirection="column">
      <Text>Sort by: {sortBy} ({sortOrder})</Text>
      {sortedItems.map((item, index) => (
        <Text key={index}>
          {item.date} - Value: {item.value} - Count: {item.count}
        </Text>
      ))}
    </Box>
  );
};

// Example 5: Pagination
const PaginationExample = () => {
  const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);
  
  const {
    paginatedItems,
    currentPage,
    totalPages,
    nextPage,
    previousPage,
    goToFirst,
    goToLast,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(items, 10);

  useKeyboardNavigation({
    onRight: hasNextPage ? nextPage : undefined,
    onLeft: hasPreviousPage ? previousPage : undefined,
    customHandlers: {
      'H': goToFirst,
      'L': goToLast,
    },
  });

  return (
    <Box flexDirection="column">
      <Text>Page {currentPage + 1} of {totalPages}</Text>
      {paginatedItems.map((item, index) => (
        <Text key={index}>{item}</Text>
      ))}
      <Text dimColor>
        Use ← → to navigate pages, H/L for first/last
      </Text>
    </Box>
  );
};

// Example 6: Debounced search
const SearchExample = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  React.useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search with debounced term
      console.log('Searching for:', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <Box>
      <Text>Search: {searchTerm}</Text>
      <Text dimColor>Debounced: {debouncedSearchTerm}</Text>
    </Box>
  );
};

// Example 7: Auto-refresh
const AutoRefreshExample = () => {
  const { state, dispatch } = useApp();
  const [refreshCount, setRefreshCount] = React.useState(0);

  const refreshData = React.useCallback(() => {
    setRefreshCount(prev => prev + 1);
    dispatch(actions.setLoading(true));
    // Simulate data refresh
    setTimeout(() => {
      dispatch(actions.setLoading(false));
    }, 1000);
  }, [dispatch]);

  // Auto-refresh every 5 seconds when enabled
  useAutoRefresh(refreshData, 5000, state.settings.watchMode);

  return (
    <Box>
      <Text>Refresh Count: {refreshCount}</Text>
      <Text>Auto-refresh: {state.settings.watchMode ? 'ON' : 'OFF'}</Text>
    </Box>
  );
};

// Example 8: Full navigation controller
const NavigationControllerExample = () => {
  const { focusIndex, handleViewChange } = useNavigationController();

  return (
    <Box flexDirection="column">
      <Text>Navigation Controller Active</Text>
      <Text>Focus Index: {focusIndex}</Text>
      <Text dimColor>
        Press 'd' for dashboard, 'e' for export, 's' for settings
      </Text>
    </Box>
  );
};

// Example 9: View transitions
const ViewTransitionExample = () => {
  const { currentView, transitionTo, goBack } = useViewTransition();

  useKeyboardNavigation({
    onEscape: goBack,
    customHandlers: {
      '1': () => transitionTo('dashboard'),
      '2': () => transitionTo('details', { selectedDate: '2024-01-01' }),
      '3': () => transitionTo('export'),
      '4': () => transitionTo('settings'),
    },
  });

  return (
    <Box>
      <Text>Current View: {currentView}</Text>
      <Text dimColor>Press 1-4 to switch views, ESC to go back</Text>
    </Box>
  );
};

// Example 10: Complete app with all features
const CompleteAppExample = () => {
  return (
    <AppProvider>
      <Box flexDirection="column" padding={1}>
        <NavigationControllerExample />
        <Box marginTop={1}>
          <SelectionExample />
        </Box>
        <Box marginTop={1}>
          <AutoRefreshExample />
        </Box>
      </Box>
    </AppProvider>
  );
};

export {
  BasicStateExample,
  KeyboardNavigationExample,
  SelectionExample,
  SortingExample,
  PaginationExample,
  SearchExample,
  AutoRefreshExample,
  NavigationControllerExample,
  ViewTransitionExample,
  CompleteAppExample,
};