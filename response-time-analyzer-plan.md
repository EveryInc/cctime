# Claude Code Response Time Analyzer - Project Plan

## Overview
Build an interactive CLI tool using Ink (React for CLIs) to analyze Claude Code transcripts and calculate the cumulative response times between user messages and assistant responses, aggregated by day.

## Core Concept
- **Response Time**: Time elapsed between a user message and the subsequent assistant message
- **Daily Aggregation**: Sum of all response times for each day
- **Interactive Visualization**: Real-time, interactive display using Ink components

## Data Structure

### Input (from JSONL transcripts)
```typescript
interface TranscriptEntry {
  type: 'user' | 'assistant' | 'system' | 'tool_result';
  message?: string;
  timestamp: string;
  usage?: TokenUsage;
}
```

### Output Structure
```typescript
interface DailyResponseTime {
  date: string;                    // YYYY-MM-DD
  totalResponseTime: number;       // milliseconds
  averageResponseTime: number;     // milliseconds
  responseCount: number;           // number of responses
  sessions: Set<string>;           // unique session IDs
}

interface ResponseTimeMetrics {
  daily: Map<string, DailyResponseTime>;
  totalTime: number;
  totalResponses: number;
  averageTime: number;
}
```

## Implementation Plan

### Phase 1: Core Data Processing
1. **Session File Discovery**
   - Scan `~/.claude/projects/` for all JSONL files
   - Support filtering by date range
   - Handle project path resolution

2. **Response Time Calculator**
   ```typescript
   function calculateResponseTimes(transcript: TranscriptEntry[]): ResponseTime[] {
     // For each user message, find the next assistant message
     // Calculate time difference
     // Handle edge cases (no response, tool calls in between)
   }
   ```

3. **Daily Aggregator**
   ```typescript
   function aggregateByDay(responseTimes: ResponseTime[]): Map<string, DailyResponseTime> {
     // Group response times by date
     // Calculate daily totals and averages
     // Track unique sessions per day
   }
   ```

### Phase 2: Interactive Ink CLI Interface

1. **Main App Component Structure**
   ```tsx
   const App = () => {
     const [view, setView] = useState<'dashboard' | 'details' | 'export'>('dashboard');
     const [selectedDate, setSelectedDate] = useState<string | null>(null);
     const [data, setData] = useState<DailyResponseTime[]>([]);
     
     useInput((input, key) => {
       // Navigation: j/k or arrows to move up/down
       // Enter to drill into date details
       // Tab to switch views
       // q to quit
     });
     
     return (
       <Box flexDirection="column">
         <Header stats={summaryStats} />
         {view === 'dashboard' && <Dashboard data={data} />}
         {view === 'details' && <DateDetails date={selectedDate} />}
         {view === 'export' && <ExportOptions />}
         <StatusBar currentView={view} />
       </Box>
     );
   };
   ```

2. **Ink Components**

   **Dashboard Component** (using ink-table):
   ```tsx
   <Box flexDirection="column">
     <Text bold color="cyan">📊 Response Time Analytics</Text>
     <Box marginY={1}>
       <Table
         data={dailyData}
         columns={['Date', 'Total Time', 'Avg Time', 'Count', 'Sessions']}
       />
     </Box>
     <Box>
       <AsciiChart data={trendData} height={10} />
     </Box>
   </Box>
   ```

   **Progress Indicator** (during data loading):
   ```tsx
   <Box flexDirection="column">
     <Text>
       <Spinner type="dots" /> Analyzing transcripts...
     </Text>
     <ProgressBar current={processed} total={totalFiles} />
     <Text dimColor>Processing: {currentFile}</Text>
   </Box>
   ```

   **Interactive Date Selector**:
   ```tsx
   <SelectInput
     items={dates.map(date => ({
       label: formatDate(date),
       value: date
     }))}
     onSelect={handleDateSelect}
   />
   ```

3. **Real-time Updates**
   - Watch mode to monitor new sessions as they're created
   - Live refresh of statistics
   - Animated transitions between views

### Phase 3: Ink-Powered Visualizations

1. **ASCII Charts Integration**
   ```tsx
   import asciichart from 'asciichart';
   
   const ResponseTimeChart = ({ data }) => {
     const chartData = data.map(d => d.averageResponseTime);
     const chart = asciichart.plot(chartData, {
       height: 10,
       colors: [asciichart.cyan]
     });
     
     return <Text>{chart}</Text>;
   };
   ```

2. **Interactive Table with Highlighting**
   ```tsx
   const InteractiveTable = ({ data, selectedIndex }) => {
     return (
       <Box flexDirection="column">
         {data.map((row, index) => (
           <Box key={row.date}>
             <Text
               backgroundColor={index === selectedIndex ? 'blue' : undefined}
               color={index === selectedIndex ? 'white' : 'green'}
             >
               {formatRow(row)}
             </Text>
           </Box>
         ))}
       </Box>
     );
   };
   ```

3. **Split Pane View**
   ```tsx
   <Box>
     <Box flexBasis="60%" paddingRight={1}>
       <MainTable />
     </Box>
     <Box flexBasis="40%">
       <DetailsSidebar />
     </Box>
   </Box>
   ```

### Phase 4: Advanced Ink Features

1. **Multi-Tab Interface**
   ```tsx
   const TabBar = ({ tabs, activeTab }) => (
     <Box marginBottom={1}>
       {tabs.map((tab, i) => (
         <Box key={tab} marginRight={2}>
           <Text
             bold={activeTab === i}
             color={activeTab === i ? 'cyan' : 'gray'}
           >
             {tab}
           </Text>
         </Box>
       ))}
     </Box>
   );
   ```

2. **Keyboard Shortcuts Display**
   ```tsx
   const HelpBar = () => (
     <Box marginTop={1} borderStyle="single" borderColor="gray">
       <Text dimColor>
         ↑↓ Navigate │ ↵ Select │ Tab Switch View │ e Export │ q Quit
       </Text>
     </Box>
   );
   ```

3. **Loading States with Suspense**
   ```tsx
   <Suspense fallback={<LoadingSpinner />}>
     <DataDisplay />
   </Suspense>
   ```

## Technical Architecture

### Core Modules
1. **`src/loader.ts`** - File discovery and JSONL parsing
2. **`src/calculator.ts`** - Response time calculations
3. **`src/aggregator.ts`** - Daily/weekly/monthly aggregation
4. **`src/cli.tsx`** - Main Ink app entry point
5. **`src/components/`** - Ink component library
   - `Dashboard.tsx` - Main dashboard view
   - `Table.tsx` - Interactive data table
   - `Chart.tsx` - ASCII chart wrapper
   - `ProgressBar.tsx` - Loading progress
   - `DatePicker.tsx` - Date range selector
   - `ExportDialog.tsx` - Export options UI

### Dependencies
- **ink** (v6.0+) - React for CLIs, main UI framework
- **ink-table** - Table component for structured data display
- **ink-progress-bar** - Progress indicators
- **ink-spinner** - Loading spinners
- **asciichart** - ASCII line charts for trend visualization
- **commander** - CLI argument parsing (for initial launch)
- **date-fns** - Date manipulation and formatting
- **chalk** - Terminal text styling (for non-Ink outputs)

### Data Flow
```
JSONL Files → Parser → Response Calculator → Aggregator → Formatter → Output
                ↓                              ↓
            Validation                    Statistics
```

## Edge Cases to Handle
1. **Interrupted Conversations**: User message with no assistant response
2. **Tool Interactions**: Multiple tool calls between user and assistant
3. **System Messages**: Filter out or handle separately
4. **Concurrent Sessions**: Properly attribute times to correct sessions
5. **Time Zone Handling**: Consistent date calculations
6. **Large Files**: Stream processing for efficiency

## Performance Considerations
1. **Streaming Parser**: Process large JSONL files without loading entire file
2. **Caching**: Cache processed results for faster subsequent runs
3. **Parallel Processing**: Process multiple sessions concurrently
4. **Memory Management**: Limit in-memory data structures

## Testing Strategy
1. **Unit Tests**
   - Response time calculation logic
   - Date aggregation functions
   - Edge case handling

2. **Integration Tests**
   - Full transcript processing
   - CLI command execution
   - Output format validation

3. **Test Data**
   - Mock transcripts with known timings
   - Edge case scenarios
   - Performance benchmarks

## Future Enhancements
1. **Real-time Monitoring**: Watch for new sessions and update stats
2. **Comparison Mode**: Compare response times across different time periods
3. **Model Analysis**: Response times by Claude model version
4. **Export to Dashboard**: Web-based visualization
5. **Alerts**: Notify when response times exceed thresholds

## Implementation Timeline
- **Week 1**: Core data processing (loader, calculator, aggregator)
- **Week 2**: CLI interface and basic output formats
- **Week 3**: Ink visualizations and advanced features
- **Week 4**: Testing, documentation, and polish

## Ink-Specific Implementation Details

### App State Management
```tsx
interface AppState {
  data: DailyResponseTime[];
  loading: boolean;
  error: string | null;
  view: 'dashboard' | 'details' | 'export';
  selectedDate: string | null;
  dateRange: { from: Date; to: Date };
  sortBy: 'date' | 'totalTime' | 'avgTime';
  sortOrder: 'asc' | 'desc';
}

// Use React Context for global state
const AppContext = createContext<AppState>(initialState);
```

### Key Ink Patterns

1. **Responsive Layout**
   ```tsx
   const { stdout } = useStdout();
   const terminalWidth = stdout.columns;
   const terminalHeight = stdout.rows;
   ```

2. **Focus Management**
   ```tsx
   const { focusNext, focusPrevious } = useFocus();
   
   useInput((input, key) => {
     if (key.tab) focusNext();
     if (key.shift && key.tab) focusPrevious();
   });
   ```

3. **File System Watching**
   ```tsx
   useEffect(() => {
     const watcher = fs.watch(claudeDir, (event, filename) => {
       if (filename?.endsWith('.jsonl')) {
         reloadData();
       }
     });
     
     return () => watcher.close();
   }, []);
   ```

### Example Full App Structure
```tsx
// src/cli.tsx
#!/usr/bin/env bun
import { render } from 'ink';
import { App } from './App.js';

const cli = meow(`
  Usage
    $ cctime
    
  Options
    --from    Start date
    --to      End date
    --watch   Live updates
`);

render(<App {...cli.flags} />);
```

## Success Metrics
- Accurately calculate response times from real transcripts
- Process months of data in under 10 seconds
- Provide smooth, responsive Ink UI with <100ms interaction latency
- Support keyboard navigation throughout the entire interface
- Easy to install and use (single command)