import figlet from 'figlet';

const layouts = ['default', 'full', 'fitted', 'controlled smushing', 'universal smushing'];

layouts.forEach(layout => {
  console.log(`\n=== Layout: ${layout} ===`);
  try {
    console.log(figlet.textSync('EVERY', { 
      font: 'Big',
      horizontalLayout: layout 
    }));
  } catch (e) {
    console.log(`Error with layout ${layout}`);
  }
});