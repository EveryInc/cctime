import imageToAscii from 'image-to-ascii';

imageToAscii('/Users/dannyaziz/Development/cctime/assets/every-logo.png', {
  size: {
    width: 40,
    height: 10
  },
  colored: false,
  pixels: ' .,:;i1tfLCG08@'
}, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('ASCII Art:');
    console.log(result);
  }
});