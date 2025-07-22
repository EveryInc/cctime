import figlet from 'figlet';

const fonts = ['Standard', 'Big', 'Block', 'Bubble', 'Digital', 'Ivrit', 'Lean', 'Mini', 'Script', 'Shadow', 'Small', 'Smscript', 'Smshadow', 'Smslant', 'Thin'];

fonts.forEach(font => {
  console.log(`\n=== Font: ${font} ===`);
  try {
    console.log(figlet.textSync('EVERY', { font }));
  } catch (e) {
    console.log(`Error with font ${font}`);
  }
});