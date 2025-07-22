import React from 'react';
import { Box, Text } from 'ink';

interface KeyboardHint {
  key: string;
  description: string;
  modifier?: 'ctrl' | 'cmd' | 'shift' | 'alt';
}

interface BaseKeyboardHintsProps {
  hints: KeyboardHint[];
  title?: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
  showBorder?: boolean;
  context?: string; // For context-aware hints
}

export const BaseKeyboardHints: React.FC<BaseKeyboardHintsProps> = ({
  hints,
  title = 'Keyboard Shortcuts',
  layout = 'horizontal',
  showBorder = true,
  context
}) => {
  // Filter hints based on context if provided
  const activeHints = context
    ? hints.filter(hint => 
        hint.description.toLowerCase().includes(context.toLowerCase()) ||
        context === 'all'
      )
    : hints;

  if (activeHints.length === 0) {
    return null;
  }

  // Format key with modifier
  const formatKey = (hint: KeyboardHint): string => {
    let key = hint.key;
    
    // Safety check
    if (!key) {
      return '';
    }
    
    // Special key formatting
    const specialKeys: Record<string, string> = {
      'return': '⏎',
      'enter': '⏎',
      'space': '␣',
      'tab': '⇥',
      'escape': 'ESC',
      'esc': 'ESC',
      'delete': 'DEL',
      'backspace': '⌫',
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    };

    const lowerKey = key.toLowerCase();
    if (specialKeys[lowerKey]) {
      key = specialKeys[lowerKey];
    }

    if (hint.modifier) {
      const modifierSymbols: Record<string, string> = {
        'ctrl': '⌃',
        'cmd': '⌘',
        'shift': '⇧',
        'alt': '⌥'
      };
      return `${modifierSymbols[hint.modifier]}${key}`;
    }

    return key;
  };

  // Render single hint
  const renderHint = (hint: KeyboardHint, index: number) => (
    <Box key={index} gap={1}>
      <Box minWidth={6}>
        <Text bold color="cyan">{formatKey(hint)}</Text>
      </Box>
      <Text dimColor>{hint.description}</Text>
    </Box>
  );

  // Render hints based on layout
  const renderHints = () => {
    switch (layout) {
      case 'vertical':
        return (
          <Box flexDirection="column" gap={1}>
            {activeHints.map(renderHint)}
          </Box>
        );
      
      case 'grid':
        // Split hints into two columns
        const midpoint = Math.ceil(activeHints.length / 2);
        const leftColumn = activeHints.slice(0, midpoint);
        const rightColumn = activeHints.slice(midpoint);
        
        return (
          <Box gap={4}>
            <Box flexDirection="column" gap={1}>
              {leftColumn.map(renderHint)}
            </Box>
            <Box flexDirection="column" gap={1}>
              {rightColumn.map(renderHint)}
            </Box>
          </Box>
        );
      
      case 'horizontal':
      default:
        return (
          <Box gap={3} flexWrap="wrap">
            {activeHints.map((hint, index) => (
              <Box key={index} gap={1}>
                <Text bold color="cyan">{formatKey(hint)}</Text>
                <Text dimColor>{hint.description}</Text>
                {index < activeHints.length - 1 && <Text dimColor>│</Text>}
              </Box>
            ))}
          </Box>
        );
    }
  };

  const content = (
    <Box flexDirection="column" gap={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold underline={showBorder}>{title}</Text>
        </Box>
      )}
      {renderHints()}
    </Box>
  );

  if (showBorder) {
    return (
      <Box 
        borderStyle="single" 
        borderColor="gray"
        padding={1}
        flexDirection="column"
      >
        {content}
      </Box>
    );
  }

  return content;
};

// Pre-defined hint sets for common contexts
export const commonHints = {
  navigation: [
    { key: 'up', description: 'Previous item' },
    { key: 'down', description: 'Next item' },
    { key: 'return', description: 'Select' },
    { key: 'escape', description: 'Back' }
  ],
  
  table: [
    { key: 'up', description: 'Previous row' },
    { key: 'down', description: 'Next row' },
    { key: 'return', description: 'View details' },
    { key: 'd', description: 'Sort by date' },
    { key: 't', description: 'Sort by total time' },
    { key: 'a', description: 'Sort by average' },
    { key: 'c', description: 'Sort by count' }
  ],
  
  global: [
    { key: 'q', description: 'Quit' },
    { key: 'h', description: 'Help' },
    { key: 'r', description: 'Refresh' },
    { key: 'e', description: 'Export' }
  ],
  
  export: [
    { key: 'j', description: 'Export JSON' },
    { key: 'c', description: 'Export CSV' },
    { key: 'm', description: 'Export Markdown' },
    { key: 'escape', description: 'Cancel' }
  ]
};