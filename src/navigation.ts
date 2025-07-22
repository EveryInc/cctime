import { useInput, useApp, Key } from 'ink';
import { useCallback, useRef } from 'react';
import { useAppContext, actions } from './state/store.js';
import type { UIState } from './types.js';

// Keyboard shortcut mappings
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  TAB: 'tab',
  SHIFT_TAB: 'shift+tab',
  ENTER: 'return',
  ESCAPE: 'escape',
  
  // Movement
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  PAGE_UP: 'pageUp',
  PAGE_DOWN: 'pageDown',
  HOME: 'home',
  END: 'end',
  
  // View switching
  DASHBOARD: 'd',
  DETAILS: 'v',
  EXPORT: 'e',
  SETTINGS: 's',
  
  // Actions
  QUIT: 'q',
  REFRESH: 'r',
  SORT: 'o',
  TOGGLE_SORT_ORDER: 'O',
  HELP: '?',
  
  // Export formats
  EXPORT_JSON: 'j',
  EXPORT_CSV: 'c',
  EXPORT_MARKDOWN: 'm',
} as const;

// Navigation controller hook
export function useNavigationController() {
  const { state, dispatch } = useAppContext();
  const { exit } = useApp();
  
  // Focus management
  const focusIndex = useRef(0);
  const maxFocusIndex = useRef(0);
  
  const handleViewChange = useCallback((view: UIState['view']) => {
    dispatch(actions.setView(view));
    focusIndex.current = 0; // Reset focus when changing views
  }, [dispatch]);
  
  const handleNavigation = useCallback((input: string, key: Key) => {
    // Global shortcuts (work in any view)
    if (input === KEYBOARD_SHORTCUTS.QUIT) {
      exit();
      return;
    }
    
    if (input === KEYBOARD_SHORTCUTS.DASHBOARD) {
      handleViewChange('dashboard');
      return;
    }
    
    if (input === KEYBOARD_SHORTCUTS.EXPORT) {
      handleViewChange('export');
      return;
    }
    
    if (input === KEYBOARD_SHORTCUTS.SETTINGS) {
      handleViewChange('settings');
      return;
    }
    
    // Escape key - go back to dashboard
    if (key.escape) {
      handleViewChange('dashboard');
      return;
    }
    
    // View-specific navigation
    switch (state.ui.view) {
      case 'dashboard':
        handleDashboardNavigation(input, key);
        break;
      case 'details':
        handleDetailsNavigation(input, key);
        break;
      case 'export':
        handleExportNavigation(input, key);
        break;
      case 'settings':
        handleSettingsNavigation(input, key);
        break;
    }
  }, [state.ui.view, exit, handleViewChange]);
  
  const handleDashboardNavigation = useCallback((input: string, key: Key) => {
    // Arrow navigation for table
    if (key.upArrow || key.downArrow) {
      const dailyData = state.data?.daily ? Array.from(state.data.daily.values()) : [];
      const maxIndex = dailyData.length - 1;
      
      let newIndex = state.ui.selectedIndex;
      if (key.upArrow) {
        newIndex = Math.max(0, newIndex - 1);
      } else {
        newIndex = Math.min(maxIndex, newIndex + 1);
      }
      
      // Update selected index in state
      dispatch(actions.setSelectedIndex(newIndex));
    }
    
    // Enter key - view details for selected date
    if (key.return && state.data) {
      const dailyData = Array.from(state.data.daily.values());
      const selectedEntry = dailyData[state.ui.selectedIndex];
      if (selectedEntry) {
        dispatch(actions.selectDate(selectedEntry.date));
      }
    }
    
    // Sort controls
    if (input === KEYBOARD_SHORTCUTS.SORT) {
      const sortOptions: UIState['sortBy'][] = ['date', 'totalTime', 'avgTime', 'count'];
      const currentIndex = sortOptions.indexOf(state.ui.sortBy);
      const nextIndex = (currentIndex + 1) % sortOptions.length;
      dispatch(actions.setSort(sortOptions[nextIndex], state.ui.sortOrder));
    }
    
    if (input === KEYBOARD_SHORTCUTS.TOGGLE_SORT_ORDER) {
      const newOrder = state.ui.sortOrder === 'asc' ? 'desc' : 'asc';
      dispatch(actions.setSort(state.ui.sortBy, newOrder));
    }
  }, [state, dispatch]);
  
  const handleDetailsNavigation = useCallback((input: string, key: Key) => {
    // Escape or 'b' to go back to dashboard
    if (key.escape || input === 'b') {
      handleViewChange('dashboard');
    }
    
    // Arrow keys to navigate between sessions
    if (key.upArrow || key.downArrow) {
      // Implement session navigation
    }
  }, [handleViewChange]);
  
  const handleExportNavigation = useCallback((input: string, key: Key) => {
    // The ExportDialog component handles its own navigation
    // We only need to handle the escape key here to go back
    if (key.escape) {
      handleViewChange('dashboard');
    }
  }, [handleViewChange]);
  
  const handleSettingsNavigation = useCallback((input: string, key: Key) => {
    // Tab navigation between settings
    if (key.tab) {
      focusIndex.current = (focusIndex.current + 1) % (maxFocusIndex.current + 1);
    } else if (key.shift && key.tab) {
      focusIndex.current = focusIndex.current === 0 
        ? maxFocusIndex.current 
        : focusIndex.current - 1;
    }
    
    // Toggle boolean settings with space
    if (input === ' ') {
      // Toggle the currently focused setting
    }
    
    // Escape to go back
    if (key.escape) {
      handleViewChange('dashboard');
    }
  }, [handleViewChange]);
  
  // Register the input handler
  useInput(handleNavigation);
  
  return {
    focusIndex: focusIndex.current,
    setMaxFocusIndex: (max: number) => { maxFocusIndex.current = max; },
    handleViewChange,
  };
}

// Focus management helper
export function useFocusManager(itemCount: number) {
  const focusedIndex = useRef(0);
  
  const handleFocusChange = useCallback((direction: 'up' | 'down' | 'first' | 'last') => {
    switch (direction) {
      case 'up':
        focusedIndex.current = Math.max(0, focusedIndex.current - 1);
        break;
      case 'down':
        focusedIndex.current = Math.min(itemCount - 1, focusedIndex.current + 1);
        break;
      case 'first':
        focusedIndex.current = 0;
        break;
      case 'last':
        focusedIndex.current = itemCount - 1;
        break;
    }
  }, [itemCount]);
  
  const isFocused = useCallback((index: number) => {
    return focusedIndex.current === index;
  }, []);
  
  return {
    focusedIndex: focusedIndex.current,
    handleFocusChange,
    isFocused,
  };
}

// View transition helper
export function useViewTransition() {
  const { state, dispatch } = useAppContext();
  
  const transitionTo = useCallback((
    view: UIState['view'], 
    options?: { selectedDate?: string }
  ) => {
    if (options?.selectedDate) {
      dispatch(actions.selectDate(options.selectedDate));
    } else {
      dispatch(actions.setView(view));
    }
  }, [dispatch]);
  
  const goBack = useCallback(() => {
    // Simple back navigation - could be enhanced with history
    if (state.ui.view !== 'dashboard') {
      dispatch(actions.setView('dashboard'));
    }
  }, [state.ui.view, dispatch]);
  
  return {
    currentView: state.ui.view,
    transitionTo,
    goBack,
  };
}