import terminalImage from 'terminal-image';
import { promises as fs } from 'fs';

const imagePath = '/Users/dannyaziz/Development/cctime/assets/every-logo.png';

try {
  const imageBuffer = await fs.readFile(imagePath);
  console.log('Image loaded, size:', imageBuffer.length, 'bytes');
  
  const rendered = await terminalImage.buffer(imageBuffer, {
    width: 40,
    height: 10
  });
  
  console.log('Rendered image:');
  console.log(rendered);
} catch (error) {
  console.error('Error:', error);
}