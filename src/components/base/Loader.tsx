import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';

interface LoaderProps {
  text?: string;
  type?: 'dots' | 'line' | 'circle' | 'square' | 'bounce' | 'pulse';
  color?: string;
}

const spinners = {
  dots: {
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interval: 80,
  },
  line: {
    frames: ['─', '\\', '|', '/'],
    interval: 130,
  },
  circle: {
    frames: ['◐', '◓', '◑', '◒'],
    interval: 120,
  },
  square: {
    frames: ['◰', '◳', '◲', '◱'],
    interval: 180,
  },
  bounce: {
    frames: ['⠁', '⠂', '⠄', '⠂'],
    interval: 120,
  },
  pulse: {
    frames: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
    interval: 80,
  },
};

export const Loader: React.FC<LoaderProps> = ({ 
  text = 'Loading', 
  type = 'dots',
  color
}) => {
  const [frame, setFrame] = useState(0);
  const spinner = spinners[type];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % spinner.frames.length);
    }, spinner.interval);
    
    return () => clearInterval(timer);
  }, [spinner]);
  
  const frameColor = color || 'cyan';
  
  return (
    <Box>
      <Text color={frameColor}>{spinner.frames[frame]}</Text>
      <Text> {text}</Text>
    </Box>
  );
};

// Custom animated loader with multiple spinners
interface MultiLoaderProps {
  text?: string;
  spinnerCount?: number;
}

export const MultiLoader: React.FC<MultiLoaderProps> = ({ 
  text = 'Processing',
  spinnerCount = 3 
}) => {
  const [frames, setFrames] = useState<number[]>(new Array(spinnerCount).fill(0));
  const spinner = spinners.dots;
  
  useEffect(() => {
    const timers = frames.map((_, index) => {
      return setInterval(() => {
        setFrames(prev => {
          const newFrames = [...prev];
          newFrames[index] = (newFrames[index] + 1) % spinner.frames.length;
          return newFrames;
        });
      }, spinner.interval + (index * 20)); // Stagger the animations
    });
    
    return () => timers.forEach(timer => clearInterval(timer));
  }, [spinnerCount]);
  
  return (
    <Box>
      <Text color="cyan">
        {frames.map((frame, i) => spinner.frames[frame]).join(' ')}
      </Text>
      <Text> {text}</Text>
    </Box>
  );
};

// Progress loader with percentage
interface ProgressLoaderProps {
  progress: number; // 0-100
  text?: string;
  showPercentage?: boolean;
  barWidth?: number;
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  progress,
  text = 'Loading',
  showPercentage = true,
  barWidth = 20
}) => {
  const filled = Math.floor((progress / 100) * barWidth);
  const empty = barWidth - filled;
  
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{text}</Text>
        {showPercentage && <Text> {progress}%</Text>}
      </Box>
      <Box>
        <Text color="green">{'█'.repeat(filled)}</Text>
        <Text color="gray">{'░'.repeat(empty)}</Text>
      </Box>
    </Box>
  );
};

// Animated text loader
interface TextLoaderProps {
  text: string;
  animationType?: 'typewriter' | 'fade' | 'wave';
}

export const TextLoader: React.FC<TextLoaderProps> = ({
  text,
  animationType = 'typewriter'
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (animationType === 'typewriter' && currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, animationType]);
  
  if (animationType === 'typewriter') {
    return (
      <Box>
        <Text>{displayText}</Text>
        <Text color="gray">{currentIndex < text.length ? '▊' : ''}</Text>
      </Box>
    );
  }
  
  return <Text>{text}</Text>;
};