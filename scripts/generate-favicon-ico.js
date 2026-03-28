import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

// Simple approach: resize PNG to required sizes, then convert to ICO
const INPUT = 'public/favicon.png';
const OUTPUT = 'public/favicon.ico';

async function run() {
  try {
    const ico = await pngToIco(INPUT);
    writeFileSync(OUTPUT, ico);
    console.log('✅ Generated favicon.ico from favicon.png');
  } catch (err) {
    console.error('Failed to generate favicon.ico:', err.message);
    process.exit(1);
  }
}

run();
