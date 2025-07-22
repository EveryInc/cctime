import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useAppContext, actions } from '../../state/store.js';
import { exportData } from '../../export/index.js';
import type { ProcessedData } from '../../types.js';

interface ExportDialogProps {
  onClose: () => void;
}

type ExportFormat = 'json' | 'csv' | 'markdown';
type ExportStep = 'format' | 'options' | 'path' | 'exporting' | 'complete' | 'error';

interface ExportState {
  step: ExportStep;
  format: ExportFormat;
  includeStats: boolean;
  toClipboard: boolean;
  customPath: string;
  useCustomPath: boolean;
  error?: string;
  resultPath?: string;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { state } = useAppContext();
  const [exportState, setExportState] = useState<ExportState>({
    step: 'format',
    format: 'json',
    includeStats: true,
    toClipboard: false,
    customPath: '',
    useCustomPath: false
  });

  // Format selection items
  const formatItems = [
    { label: 'JSON - Pretty printed data structure', value: 'json' },
    { label: 'CSV - Spreadsheet compatible', value: 'csv' },
    { label: 'Markdown - Human readable report', value: 'markdown' }
  ];

  // Options selection items
  const optionItems = [
    { 
      label: exportState.includeStats ? '✓ Include detailed statistics' : '  Include detailed statistics', 
      value: 'stats' 
    },
    { 
      label: exportState.toClipboard ? '✓ Copy to clipboard' : '  Copy to clipboard', 
      value: 'clipboard' 
    },
    { 
      label: exportState.useCustomPath ? '✓ Custom output path' : '  Use default output path', 
      value: 'path' 
    },
    { label: '→ Continue', value: 'continue' }
  ];

  const handleFormatSelect = (item: { value: string }) => {
    setExportState({ 
      ...exportState, 
      format: item.value as ExportFormat,
      step: 'options'
    });
  };

  const handleOptionSelect = (item: { value: string }) => {
    switch (item.value) {
      case 'stats':
        setExportState({ ...exportState, includeStats: !exportState.includeStats });
        break;
      case 'clipboard':
        setExportState({ ...exportState, toClipboard: !exportState.toClipboard });
        break;
      case 'path':
        setExportState({ ...exportState, useCustomPath: !exportState.useCustomPath });
        break;
      case 'continue':
        if (exportState.useCustomPath && !exportState.toClipboard) {
          setExportState({ ...exportState, step: 'path' });
        } else {
          performExport();
        }
        break;
    }
  };

  const handlePathSubmit = (path: string) => {
    setExportState({ ...exportState, customPath: path });
    performExport();
  };

  const performExport = async () => {
    if (!state.data) {
      setExportState({ 
        ...exportState, 
        step: 'error', 
        error: 'No data available to export' 
      });
      return;
    }

    setExportState({ ...exportState, step: 'exporting' });

    try {
      const result = await exportData(state.data, {
        format: exportState.format,
        includeStats: exportState.includeStats,
        toClipboard: exportState.toClipboard,
        outputPath: exportState.useCustomPath && exportState.customPath ? exportState.customPath : undefined
      });

      if (result.success) {
        setExportState({ 
          ...exportState, 
          step: 'complete',
          resultPath: result.filePath
        });
      } else {
        setExportState({ 
          ...exportState, 
          step: 'error',
          error: result.error || 'Export failed'
        });
      }
    } catch (error) {
      setExportState({ 
        ...exportState, 
        step: 'error',
        error: error instanceof Error ? error.message : 'Unknown export error'
      });
    }
  };

  // Render based on current step
  switch (exportState.step) {
    case 'format':
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="cyan">Export Data</Text>
          <Text dimColor>Select export format:</Text>
          <Box marginTop={1}>
            <SelectInput items={formatItems} onSelect={handleFormatSelect} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press ESC to cancel</Text>
          </Box>
        </Box>
      );

    case 'options':
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="cyan">Export Options</Text>
          <Text dimColor>Format: {exportState.format.toUpperCase()}</Text>
          <Box marginTop={1}>
            <SelectInput items={optionItems} onSelect={handleOptionSelect} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press ESC to cancel</Text>
          </Box>
        </Box>
      );

    case 'path':
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="cyan">Custom Export Path</Text>
          <Text dimColor>Enter the full path for the export file:</Text>
          <Box marginTop={1}>
            <Text>Path: </Text>
            <TextInput 
              value={exportState.customPath} 
              onChange={setExportState.bind(null, { ...exportState, customPath: exportState.customPath })}
              onSubmit={handlePathSubmit}
              placeholder={`/path/to/export.${exportState.format === 'markdown' ? 'md' : exportState.format}`}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press Enter to export, ESC to cancel</Text>
          </Box>
        </Box>
      );

    case 'exporting':
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="cyan">Exporting Data</Text>
          <Box marginTop={1}>
            <Text color="green">
              <Spinner type="dots" /> Exporting as {exportState.format.toUpperCase()}...
            </Text>
          </Box>
        </Box>
      );

    case 'complete':
      // Auto-close after 2 seconds
      setTimeout(onClose, 2000);
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="green">✓ Export Complete</Text>
          {exportState.resultPath && (
            <Box marginTop={1}>
              <Text>File saved to:</Text>
            </Box>
          )}
          {exportState.resultPath && (
            <Box>
              <Text color="cyan">{exportState.resultPath}</Text>
            </Box>
          )}
          {exportState.toClipboard && (
            <Box marginTop={1}>
              <Text color="yellow">Note: Clipboard export prepared but not copied (requires system integration)</Text>
            </Box>
          )}
        </Box>
      );

    case 'error':
      // Auto-close after 3 seconds
      setTimeout(onClose, 3000);
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="red">✗ Export Failed</Text>
          <Box marginTop={1}>
            <Text color="red">{exportState.error}</Text>
          </Box>
        </Box>
      );

    default:
      return null;
  }
}

// Summary component to show what will be exported
export function ExportSummary({ data }: { data: ProcessedData }) {
  const totalDays = data.daily.size;
  const totalSessions = data.sessions.size;
  const totalResponses = data.summary.totalResponses;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Export Summary:</Text>
      <Text>• {totalDays} days of data</Text>
      <Text>• {totalSessions} unique sessions</Text>
      <Text>• {totalResponses} total responses</Text>
      <Text>• Date range: {data.summary.dateRange.from} to {data.summary.dateRange.to}</Text>
    </Box>
  );
}