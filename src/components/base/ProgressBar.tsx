import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface BaseProgressBarProps {
  progress?: number; // 0-100, undefined for indefinite
  label?: string;
  currentFile?: string;
  showPercentage?: boolean;
  width?: number;
  character?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'magenta' | 'cyan';
}

export const BaseProgressBar: React.FC<BaseProgressBarProps> = ({
  progress,
  label = 'Processing',
  currentFile,
  showPercentage = true,
  width = 30,
  character = '█',
  color = 'green'
}) => {
  const [indeterminatePosition, setIndeterminatePosition] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animate indefinite progress bar
  useEffect(() => {
    if (progress === undefined) {
      const timer = setInterval(() => {
        setAnimationFrame(prev => prev + 1);
        setIndeterminatePosition(prev => (prev + 1) % (width + 10));
      }, 100);
      
      return () => clearInterval(timer);
    }
  }, [progress, width]);

  // Render determinate progress bar
  const renderDeterminateBar = () => {
    const clampedProgress = Math.max(0, Math.min(100, progress || 0));
    const filled = Math.floor((clampedProgress / 100) * width);
    const empty = width - filled;

    return (
      <>
        <Text color={color}>{character.repeat(filled)}</Text>
        <Text dimColor>{'░'.repeat(empty)}</Text>
      </>
    );
  };

  // Render indeterminate progress bar
  const renderIndeterminateBar = () => {
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const currentSpinner = spinnerChars[animationFrame % spinnerChars.length];
    
    // Create sliding indicator
    const barArray = Array(width).fill('░');
    const indicatorWidth = 5;
    const startPos = Math.max(0, Math.min(width - indicatorWidth, indeterminatePosition - 5));
    
    for (let i = 0; i < indicatorWidth && startPos + i < width; i++) {
      barArray[startPos + i] = character;
    }

    return (
      <>
        <Text color={color}>{currentSpinner} </Text>
        <Text>
          {barArray.map((char, i) => (
            <Text 
              key={i} 
              color={char === character ? color : undefined}
              dimColor={char === '░'}
            >
              {char}
            </Text>
          ))}
        </Text>
      </>
    );
  };

  // Format file path to fit
  const formatFilePath = (path: string, maxLength: number): string => {
    if (!path || path.length <= maxLength) return path;
    
    const parts = path.split('/');
    if (parts.length <= 2) {
      return '...' + path.slice(-(maxLength - 3));
    }
    
    // Show first and last parts
    const start = parts[0];
    const end = parts[parts.length - 1];
    const middle = '...';
    
    if (start.length + end.length + middle.length > maxLength) {
      return middle + end.slice(-(maxLength - 3));
    }
    
    return `${start}/${middle}/${end}`;
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={1} alignItems="center">
        <Text bold>{label}</Text>
        {showPercentage && progress !== undefined && (
          <Text color={color}>{progress.toFixed(0)}%</Text>
        )}
      </Box>
      
      <Box>
        <Text>[</Text>
        {progress !== undefined ? renderDeterminateBar() : renderIndeterminateBar()}
        <Text>]</Text>
      </Box>
      
      {currentFile && (
        <Box>
          <Text dimColor>
            {formatFilePath(currentFile, width + 10)}
          </Text>
        </Box>
      )}
    </Box>
  );
};