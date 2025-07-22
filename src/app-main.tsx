import React, { useEffect } from 'react';
import { Text, Box, useInput, useApp } from 'ink';
import InkSpinner from 'ink-spinner';
import { AppProvider, useAppState, useAppDispatch, actions } from './state/index.js';
import { useNavigationController } from './navigation.js';
import { Dashboard } from './components/views/Dashboard.js';
import { ExportDialog } from './components/views/ExportDialog.js';
import { SessionFinder } from './finder.js';
import { processTranscript } from './parser/utils.js';
import { aggregateResponseTimes } from './aggregator.js';
import ConfigManager from './config.js';

interface AppProps {
  file?: string;
  directory?: string;
  output?: string;
  cliOptions?: any;
}

const AppContent: React.FC<AppProps> = ({ file, directory }) => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { exit } = useApp();
  
  useNavigationController();
  
  useInput((input, key) => {
    if (input === 'q' && state.ui.view !== 'export') {
      exit();
    }
    
    if (key.escape && state.ui.view !== 'dashboard') {
      dispatch(actions.setView('dashboard'));
    }
  });

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      dispatch(actions.setLoading(true));
      dispatch(actions.setError(null));
      
      try {
        const finder = new SessionFinder();
        const sessions = await finder.find({
          from: state.ui.dateRange.from,
          to: state.ui.dateRange.to
        });
        
        if (sessions.length === 0) {
          dispatch(actions.setError('No Claude Code sessions found'));
          dispatch(actions.setLoading(false));
          return;
        }
        
        // Process all sessions
        const allResponseTimes = [];
        for (const session of sessions) {
          try {
            const { responseTimes } = await processTranscript(
              session.filePath,
              {
                sessionId: session.sessionId,
                projectPath: session.projectPath
              }
            );
            allResponseTimes.push(...responseTimes);
          } catch (error) {
            // Skip failed sessions
            console.error(`Failed to process ${session.sessionId}:`, error);
          }
        }
        
        if (allResponseTimes.length === 0) {
          dispatch(actions.setError('No response times found in sessions'));
          dispatch(actions.setLoading(false));
          return;
        }
        
        // Aggregate the data
        const processedData = aggregateResponseTimes(allResponseTimes);
        dispatch(actions.setData(processedData));
      } catch (error) {
        dispatch(actions.setError(error instanceof Error ? error.message : 'Failed to load data'));
      } finally {
        dispatch(actions.setLoading(false));
      }
    };
    
    loadData();
  }, [dispatch, state.ui.dateRange]);

  if (state.loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan" bold>
          <InkSpinner type="dots" /> Loading Claude Code Sessions...
        </Text>
        <Text dimColor>Scanning ~/.claude/projects for transcript files</Text>
      </Box>
    );
  }

  if (state.error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>❌ Error</Text>
        <Text>{state.error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press 'r' to retry or 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  // Render based on current view
  switch (state.ui.view) {
    case 'dashboard':
      return <Dashboard />;
    case 'export':
      return <ExportDialog />;
    case 'details':
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="cyan" bold>📊 Session Details</Text>
          <Text>Date: {state.ui.selectedDate}</Text>
          <Box marginTop={1}>
            <Text dimColor>Press Escape to go back</Text>
          </Box>
        </Box>
      );
    case 'settings':
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="cyan" bold>⚙️  Settings</Text>
          <Box marginTop={1}>
            <Text>Watch Mode: {state.settings.watchMode ? '✓' : '✗'}</Text>
            <Text>Refresh Interval: {state.settings.refreshInterval}ms</Text>
            <Text>Show Percentiles: {state.settings.showPercentiles ? '✓' : '✗'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press Escape to go back</Text>
          </Box>
        </Box>
      );
    default:
      return <Dashboard />;
  }
};

const App: React.FC<AppProps> = (props) => {
  return (
    <AppProvider>
      <AppContent {...props} />
    </AppProvider>
  );
};

export default App;