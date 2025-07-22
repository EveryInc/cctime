import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Loader, MultiLoader, ProgressLoader, TextLoader } from './Loader.js';

export const LoaderExample: React.FC = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 5;
      });
    }, 200);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>Custom Ink Loaders</Text>
      
      <Box flexDirection="column">
        <Text dimColor>Basic Spinners:</Text>
        <Loader type="dots" text="Loading data..." />
        <Loader type="line" text="Processing..." color="green" />
        <Loader type="circle" text="Analyzing..." color="yellow" />
        <Loader type="square" text="Computing..." color="magenta" />
        <Loader type="bounce" text="Fetching..." color="cyan" />
        <Loader type="pulse" text="Syncing..." color="blue" />
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Multi Spinner:</Text>
        <MultiLoader text="Processing multiple files" spinnerCount={5} />
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Progress Loader:</Text>
        <ProgressLoader progress={progress} text="Downloading" />
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Text Animation:</Text>
        <TextLoader text="Initializing Claude Code Time Analyzer..." animationType="typewriter" />
      </Box>
    </Box>
  );
};