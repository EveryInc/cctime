import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';

// Braille pattern loader
export const BrailleLoader: React.FC<{ text?: string }> = ({ text = 'Loading' }) => {
  const [frame, setFrame] = useState(0);
  const patterns = [
    '⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % patterns.length);
    }, 100);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <Box>
      <Text color="cyan">{patterns[frame]}</Text>
      <Text> {text}</Text>
    </Box>
  );
};

// Wave loader
export const WaveLoader: React.FC<{ text?: string; width?: number }> = ({ 
  text = 'Loading',
  width = 10 
}) => {
  const [position, setPosition] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setPosition(prev => (prev + 1) % (width + 3));
    }, 150);
    
    return () => clearInterval(timer);
  }, [width]);
  
  const wave = Array(width).fill('─').map((char, i) => {
    if (i === position) return '═';
    if (i === position - 1 || i === position + 1) return '─';
    return '─';
  }).join('');
  
  return (
    <Box>
      <Text color="blue">[{wave}]</Text>
      <Text> {text}</Text>
    </Box>
  );
};

// Clock loader
export const ClockLoader: React.FC<{ text?: string }> = ({ text = 'Loading' }) => {
  const [frame, setFrame] = useState(0);
  const clocks = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % clocks.length);
    }, 100);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <Box>
      <Text>{clocks[frame]}</Text>
      <Text> {text}</Text>
    </Box>
  );
};

// Matrix-style loader
export const MatrixLoader: React.FC<{ text?: string; columns?: number }> = ({ 
  text = 'Loading',
  columns = 5 
}) => {
  const [matrix, setMatrix] = useState<string[][]>(() => 
    Array(3).fill(null).map(() => Array(columns).fill(' '))
  );
  
  useEffect(() => {
    const timer = setInterval(() => {
      setMatrix(prev => {
        const newMatrix = prev.map(row => [...row]);
        
        // Randomly update some cells
        for (let i = 0; i < 2; i++) {
          const row = Math.floor(Math.random() * 3);
          const col = Math.floor(Math.random() * columns);
          const chars = '01';
          newMatrix[row][col] = chars[Math.floor(Math.random() * chars.length)];
        }
        
        // Fade effect - randomly clear some cells
        const clearRow = Math.floor(Math.random() * 3);
        const clearCol = Math.floor(Math.random() * columns);
        if (Math.random() > 0.7) {
          newMatrix[clearRow][clearCol] = ' ';
        }
        
        return newMatrix;
      });
    }, 50);
    
    return () => clearInterval(timer);
  }, [columns]);
  
  return (
    <Box flexDirection="column">
      <Box>
        {matrix.map((row, i) => (
          <Text key={i} color="green">
            {row.map((cell, j) => (
              <Text key={j} dimColor={cell === ' '}>{cell}</Text>
            ))}
          </Text>
        ))}
      </Box>
      <Text>{text}</Text>
    </Box>
  );
};

// Custom hook for creating your own loader
export const useLoader = (frames: string[], interval: number = 100) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [frames, interval]);
  
  return frames[currentFrame];
};

// Example usage of custom hook
export const CustomLoader: React.FC = () => {
  const customFrames = ['◜', '◠', '◝', '◞', '◡', '◟'];
  const frame = useLoader(customFrames, 120);
  
  return (
    <Box>
      <Text color="magenta">{frame}</Text>
      <Text> Custom loader animation</Text>
    </Box>
  );
};