import { useEffect, useCallback, useState, useRef } from 'react';
import { useInput, Key } from 'ink';
import { useAppContext, actions } from './store.js';
import type { ProcessedData, SessionFile, FindOptions } from '../types.js';

// Main state access hook
export function useAppState() {
  const { state } = useAppContext();
  return state;
}

// Main dispatch hook
export function useAppDispatch() {
  const { dispatch } = useAppContext();
  return dispatch;
}

// Combined hook for common use case
export function useApp() {
  const { state, dispatch } = useAppContext();
  return { state, dispatch };
}

// Keyboard navigation hook
export function useKeyboardNavigation(options?: {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  customHandlers?: Record<string, () => void>;
}) {
  const [lastKey, setLastKey] = useState<string | null>(null);
  
  useInput((input, key) => {
    // Track last key for debugging
    setLastKey(input || 'special');
    
    // Arrow keys
    if (key.upArrow && options?.onUp) {
      options.onUp();
    } else if (key.downArrow && options?.onDown) {
      options.onDown();
    } else if (key.leftArrow && options?.onLeft) {
      options.onLeft();
    } else if (key.rightArrow && options?.onRight) {
      options.onRight();
    }
    
    // Special keys
    if (key.return && options?.onEnter) {
      options.onEnter();
    } else if (key.escape && options?.onEscape) {
      options.onEscape();
    } else if (key.tab && !key.shift && options?.onTab) {
      options.onTab();
    } else if (key.tab && key.shift && options?.onShiftTab) {
      options.onShiftTab();
    }
    
    // Custom handlers
    if (input && options?.customHandlers?.[input]) {
      options.customHandlers[input]();
    }
  });
  
  return { lastKey };
}

// Data loader hook with effects
export function useDataLoader(options?: FindOptions) {
  const { dispatch } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  
  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    dispatch(actions.setLoading(true));
    
    try {
      // TODO: Replace with actual data loading logic
      // This is a placeholder for the actual implementation
      const mockData: ProcessedData = {
        daily: new Map(),
        sessions: new Map(),
        summary: {
          totalResponseTimeMs: 0,
          totalResponses: 0,
          averageResponseTimeMs: 0,
          uniqueSessions: 0,
          dateRange: {
            from: new Date().toISOString(),
            to: new Date().toISOString(),
          },
        },
      };
      
      // Simulate async loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      dispatch(actions.setData(mockData));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(err instanceof Error ? err : new Error(errorMessage));
      dispatch(actions.setError(errorMessage));
    } finally {
      setIsLoading(false);
      dispatch(actions.setLoading(false));
      loadingRef.current = false;
    }
  }, [dispatch, options]);
  
  // Load data on mount and when options change
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  return {
    isLoading,
    error,
    reload: loadData,
  };
}

// Watcher hook for real-time updates
export function useDataWatcher(enabled: boolean = false) {
  const { dispatch } = useAppContext();
  const [isWatching, setIsWatching] = useState(false);
  const watcherRef = useRef<any>(null);
  
  const handleFileChange = useCallback((event: 'added' | 'modified' | 'deleted', file: SessionFile) => {
    // TODO: Implement file change handling
    // This would trigger a partial data reload
    console.log(`File ${event}: ${file.filePath}`);
  }, []);
  
  useEffect(() => {
    if (!enabled) {
      if (watcherRef.current) {
        watcherRef.current.close();
        watcherRef.current = null;
        setIsWatching(false);
      }
      return;
    }
    
    // TODO: Implement actual file watching
    setIsWatching(true);
    
    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
        watcherRef.current = null;
        setIsWatching(false);
      }
    };
  }, [enabled]);
  
  return { isWatching };
}

// Selection management hook
export function useSelection<T>(items: T[], initialIndex: number = 0) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  
  const selectNext = useCallback(() => {
    setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
  }, [items.length]);
  
  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, []);
  
  const selectFirst = useCallback(() => {
    setSelectedIndex(0);
  }, []);
  
  const selectLast = useCallback(() => {
    setSelectedIndex(items.length - 1);
  }, [items.length]);
  
  const selectIndex = useCallback((index: number) => {
    setSelectedIndex(Math.max(0, Math.min(items.length - 1, index)));
  }, [items.length]);
  
  // Update index if items array changes
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);
  
  return {
    selectedIndex,
    selectedItem: items[selectedIndex],
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    selectIndex,
  };
}

// Sorting hook
export function useSorting<T>(
  items: T[],
  initialSortBy: keyof T,
  initialOrder: 'asc' | 'desc' = 'asc'
) {
  const [sortBy, setSortBy] = useState<keyof T>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialOrder);
  
  const sortedItems = [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);
  
  const changeSortBy = useCallback((field: keyof T) => {
    if (field === sortBy) {
      toggleSortOrder();
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, toggleSortOrder]);
  
  return {
    sortedItems,
    sortBy,
    sortOrder,
    changeSortBy,
    toggleSortOrder,
  };
}

// Pagination hook
export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(items.length / pageSize);
  
  const paginatedItems = items.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  
  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);
  
  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(totalPages - 1, page)));
  }, [totalPages]);
  
  const goToFirst = useCallback(() => {
    setCurrentPage(0);
  }, []);
  
  const goToLast = useCallback(() => {
    setCurrentPage(totalPages - 1);
  }, [totalPages]);
  
  // Reset to first page when items change
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);
  
  return {
    paginatedItems,
    currentPage,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    goToFirst,
    goToLast,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
  };
}

// Debounced value hook for search/filter inputs
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [value, delay]);
  
  return debouncedValue;
}

// Auto-refresh hook
export function useAutoRefresh(callback: () => void, interval: number, enabled: boolean = true) {
  const callbackRef = useRef(callback);
  
  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!enabled || interval <= 0) return;
    
    const timer = setInterval(() => {
      callbackRef.current();
    }, interval);
    
    return () => clearInterval(timer);
  }, [interval, enabled]);
}