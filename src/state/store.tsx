import React, { createContext, useReducer, ReactNode, Dispatch } from 'react';
import type { AppState, Action, ProcessedData, UIState, Settings } from '../types.js';

// Initial state
const initialUIState: UIState = {
  view: 'dashboard',
  selectedDate: null,
  selectedIndex: 0,
  sortBy: 'date',
  sortOrder: 'desc',
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  },
};

const initialSettings: Settings = {
  watchMode: false,
  refreshInterval: 5000,
  showPercentiles: true,
  exportPath: process.cwd(),
};

const initialState: AppState = {
  data: null,
  ui: initialUIState,
  settings: initialSettings,
  loading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'SET_VIEW':
      return {
        ...state,
        ui: {
          ...state.ui,
          view: action.payload,
        },
      };

    case 'SELECT_DATE':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedDate: action.payload,
          view: 'details', // Automatically switch to details view
        },
      };

    case 'SET_SORT':
      return {
        ...state,
        ui: {
          ...state.ui,
          sortBy: action.payload.sortBy,
          sortOrder: action.payload.sortOrder,
        },
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case 'SET_SELECTED_INDEX':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedIndex: action.payload,
        },
      };

    case 'UPDATE_DATE_RANGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          dateRange: action.payload,
        },
      };

    default:
      return state;
  }
}

// Context
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
  initialData?: ProcessedData;
}

export function AppProvider({ children, initialData }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    data: initialData || null,
  });

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

// Action creators
export const actions = {
  setData: (data: ProcessedData): Action => ({
    type: 'SET_DATA',
    payload: data,
  }),

  setLoading: (loading: boolean): Action => ({
    type: 'SET_LOADING',
    payload: loading,
  }),

  setError: (error: string | null): Action => ({
    type: 'SET_ERROR',
    payload: error,
  }),

  setView: (view: UIState['view']): Action => ({
    type: 'SET_VIEW',
    payload: view,
  }),

  selectDate: (date: string): Action => ({
    type: 'SELECT_DATE',
    payload: date,
  }),

  setSort: (sortBy: UIState['sortBy'], sortOrder: UIState['sortOrder']): Action => ({
    type: 'SET_SORT',
    payload: { sortBy, sortOrder },
  }),

  updateSettings: (settings: Partial<Settings>): Action => ({
    type: 'UPDATE_SETTINGS',
    payload: settings,
  }),

  setSelectedIndex: (index: number): Action => ({
    type: 'SET_SELECTED_INDEX',
    payload: index,
  }),

  updateDateRange: (from: Date, to: Date): Action => ({
    type: 'UPDATE_DATE_RANGE',
    payload: { from, to },
  }),
};