// Core data types
export interface TranscriptEntry {
  type: 'user' | 'assistant' | 'system' | 'tool_result';
  message?: string;
  timestamp: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_write_input_tokens?: number;
  };
  tool?: string;
  result?: string;
}

export interface ResponseTime {
  userMessageTimestamp: string;
  assistantMessageTimestamp: string;
  responseTimeMs: number;
  sessionId: string;
  projectPath: string;
}

export interface DailyResponseTime {
  date: string; // YYYY-MM-DD
  totalResponseTimeMs: number;
  averageResponseTimeMs: number;
  responseCount: number;
  sessions: Set<string>;
  percentiles: {
    p50: number;
    p90: number;
    p99: number;
  };
}

export interface SessionMetrics {
  sessionId: string;
  projectPath: string;
  totalResponses: number;
  totalResponseTimeMs: number;
  averageResponseTimeMs: number;
  firstMessage: string;
  lastMessage: string;
}

export interface SummaryStatistics {
  totalResponseTimeMs: number;
  totalResponses: number;
  averageResponseTimeMs: number;
  uniqueSessions: number;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface ProcessedData {
  daily: Map<string, DailyResponseTime>;
  sessions: Map<string, SessionMetrics>;
  summary: SummaryStatistics;
}

// File system types
export interface SessionFile {
  sessionId: string;
  projectPath: string;
  filePath: string;
  lastModified: Date;
  size: number;
}

export interface FindOptions {
  from?: Date;
  to?: Date;
  projectPath?: string;
}

export type WatchCallback = (event: 'added' | 'modified' | 'deleted', file: SessionFile) => void;

export interface Watcher {
  close(): void;
}

// UI Component props
export interface DashboardProps {
  data: ProcessedData;
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  onExport: () => void;
}

export interface TableProps {
  data: DailyResponseTime[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  sortBy: 'date' | 'totalTime' | 'avgTime' | 'count';
  sortOrder: 'asc' | 'desc';
}

export interface ChartProps {
  data: Array<{ date: string; value: number }>;
  height?: number;
  title?: string;
}

export interface DateDetailsProps {
  date: string;
  data: ProcessedData;
  onBack: () => void;
}

export interface ExportProps {
  data: ProcessedData;
  onExport: (format: 'json' | 'csv' | 'markdown') => void;
  onCancel: () => void;
}

// State types
export interface UIState {
  view: 'dashboard' | 'details' | 'export' | 'settings';
  selectedDate: string | null;
  selectedIndex: number;
  sortBy: 'date' | 'totalTime' | 'avgTime' | 'count';
  sortOrder: 'asc' | 'desc';
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface Settings {
  watchMode: boolean;
  refreshInterval: number;
  showPercentiles: boolean;
  exportPath: string;
}

export interface AppState {
  data: ProcessedData | null;
  ui: UIState;
  settings: Settings;
  loading: boolean;
  error: string | null;
}

export type Action =
  | { type: 'SET_DATA'; payload: ProcessedData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VIEW'; payload: UIState['view'] }
  | { type: 'SELECT_DATE'; payload: string }
  | { type: 'SET_SORT'; payload: { sortBy: UIState['sortBy']; sortOrder: UIState['sortOrder'] } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_SELECTED_INDEX'; payload: number }
  | { type: 'UPDATE_DATE_RANGE'; payload: { from: Date; to: Date } };

// CLI types
export interface CLIOptions {
  from?: string;
  to?: string;
  project?: string;
  watch?: boolean;
  config?: string;
  export?: 'json' | 'csv' | 'markdown';
}