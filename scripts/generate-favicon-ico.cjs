const pngToIco = require('png-to-ico');
const fs = require('fs');

const INPUT = 'public/favicon.png';
const OUTPUT = 'public/favicon.ico';

pngToIco(INPUT)
  .then(buf => {
    fs.writeFileSync(OUTPUT, buf);
    console.log('Generated favicon.ico');
  })
  .catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
