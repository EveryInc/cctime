import React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

interface BrandingTextProps {
  text?: string;
  font?: string;
  gradient?: string;
}

// Available fonts: block, chrome, simple, 3d, simple3d, huge, grid, pallet, shade, slick
// Available gradients: cristal, teen, mind, morning, vice, passion, fruit, instagram, atlas, retro, summer, pastel, rainbow

export function BrandingText({ 
  text = '@every', 
  font = 'chrome',
  gradient = 'pastel' 
}: BrandingTextProps) {
  const gradientProps = { name: gradient as any };
  
  return (
    <Box flexDirection="column" alignItems="center">
      <Gradient {...gradientProps}>
        <BigText text={text} font={font as any} />
      </Gradient>
    </Box>
  );
}

// Alternative compact branding
export function CompactBranding() {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text dimColor>Brought to you by</Text>
      <Box>
        <Gradient name="morning">
          <Text bold>█▀▀ █ █ █▀▀ █▀█ █ █</Text>
        </Gradient>
      </Box>
      <Box>
        <Gradient name="morning">
          <Text bold>██▄ ▀▄▀ ██▄ █▀▄ █</Text>
        </Gradient>
      </Box>
    </Box>
  );
}

// Stylized text branding
export function StylizedBranding() {
  return (
    <Box flexDirection="column" alignItems="center" marginTop={1}>
      <Text dimColor>Brought to you by</Text>
      <Box marginTop={1}>
        <Text bold>
          <Gradient name="vice">
            ╔═╗╦  ╦╔═╗╦═╗╦ ╦
          </Gradient>
        </Text>
      </Box>
      <Box>
        <Text bold>
          <Gradient name="vice">
            ║╣ ╚╗╔╝║╣ ╠╦╝╚╦╝
          </Gradient>
        </Text>
      </Box>
      <Box>
        <Text bold>
          <Gradient name="vice">
            ╚═╝ ╚╝ ╚═╝╩╚═ ╩ 
          </Gradient>
        </Text>
      </Box>
    </Box>
  );
}