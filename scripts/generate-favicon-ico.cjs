const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const sharp = require('sharp');

const INPUT = 'public/favicon.png';
const OUTPUT = 'public/favicon.ico';
const SIZES = [16, 32, 48];

async function run() {
  const buffers = [];
  for (const s of SIZES) {
    const buf = await sharp(INPUT).resize(s, s).png().toBuffer();
    buffers.push(buf);
  }
  const ico = await pngToIco(buffers);
  fs.writeFileSync(OUTPUT, ico);
  console.log('Generated favicon.ico with sizes:', SIZES.join(', '));
}

run().catch(e => { console.error(e); process.exit(1); });
