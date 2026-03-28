const { imagesToIco } = require('png-to-ico');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const os = require('os');

const INPUT = 'public/favicon.png';
const OUTPUT = 'public/favicon.ico';
const SIZES = [16, 32, 48];

async function run() {
  const tmpFiles = [];
  for (const s of SIZES) {
    const tmp = path.join(os.tmpdir(), `favicon-${s}.png`);
    await sharp(INPUT).resize(s, s).png().toFile(tmp);
    tmpFiles.push(tmp);
  }
  const buf = await imagesToIco(tmpFiles);
  fs.writeFileSync(OUTPUT, buf);
  console.log('Generated favicon.ico with sizes:', SIZES.join(', '));
  tmpFiles.forEach(f => fs.unlinkSync(f));
}

run().catch(e => { console.error(e); process.exit(1); });
