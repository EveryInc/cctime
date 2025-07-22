import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import imageToAscii from 'image-to-ascii';
import path from 'path';

interface ImageDisplayProps {
  src: string;
  width?: number;
  height?: number;
  preserveAspectRatio?: boolean;
}

export function ImageDisplay({ 
  src, 
  width = 40, 
  height = 10,
  preserveAspectRatio = true 
}: ImageDisplayProps) {
  const [ascii, setAscii] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Resolve the image path relative to the project root
    const resolvedPath = path.isAbsolute(src) 
      ? src 
      : path.join(process.cwd(), src);
    
    // Convert image to ASCII
    imageToAscii(resolvedPath, {
      size: {
        width: width,
        height: height
      },
      colored: false,
      pixels: ' .,:;i1tfLCG08@'
    }, (err, result) => {
      setLoading(false);
      if (err) {
        setError(`Failed to load image: ${err.message}`);
      } else {
        setAscii(result);
      }
    });
  }, [src, width, height]);

  if (loading) {
    return <Text dimColor>Loading image...</Text>;
  }

  if (error) {
    return <Text color="red">{error}</Text>;
  }

  return (
    <Box>
      <Text>{ascii}</Text>
    </Box>
  );
}