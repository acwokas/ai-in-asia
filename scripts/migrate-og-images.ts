/**
 * One-time migration: generate OG-optimised JPEG thumbnails for every article
 * that already has a featured_image_url in Supabase.
 *
 * Usage (from project root):
 *   npx tsx scripts/migrate-og-images.ts
 *
 * Requirements:
 *   - Node 18+ (for native fetch)
 *   - npm install sharp  (image processing, run once)
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY env vars
 *     (service-role key needed to write to storage; .env.local works)
 *
 * What it does:
 *   1. Fetches every article row that has a featured_image_url
 *   2. Downloads the original image
 *   3. Resizes to 1200×630, converts to JPEG ≤250 KB
 *   4. Uploads to  article-images/og/{baseName}-og.jpg
 *   5. Skips any that already have an OG image
 */

import 'dotenv/config';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_BYTES = 250 * 1024; // 250 KB

/** Extract the storage path after the bucket name from a public URL */
function extractStoragePath(url: string): string | null {
  const marker = '/article-images/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

/** Derive the OG path from an original storage path */
function toOgPath(storagePath: string): string {
  const filename = storagePath.split('/').pop()!;
  const baseName = filename.replace(/\.[^/.]+$/, '');
  return `og/${baseName}-og.jpg`;
}

async function processImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${imageUrl}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Resize with cover fit and convert to JPEG
  let quality = 82;
  let output: Buffer;

  while (quality >= 30) {
    output = await sharp(buffer)
      .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
      .flatten({ background: '#FFFFFF' }) // replace transparency with white
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (output.length <= MAX_BYTES) return output;
    quality -= 8;
  }

  // Return last attempt even if slightly over
  return sharp(buffer)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
    .flatten({ background: '#FFFFFF' })
    .jpeg({ quality: 30, mozjpeg: true })
    .toBuffer();
}

async function main() {
  console.log('Fetching articles with featured images...');

  // Fetch all articles and guides that have a featured_image_url
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, slug, featured_image_url')
    .not('featured_image_url', 'is', null)
    .not('featured_image_url', 'eq', '');

  if (error) {
    console.error('Failed to fetch articles:', error.message);
    process.exit(1);
  }

  console.log(`Found ${articles.length} articles with hero images.\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
    const storagePath = extractStoragePath(article.featured_image_url);
    if (!storagePath) {
      console.log(`  SKIP (non-Supabase URL): ${article.slug}`);
      skipped++;
      continue;
    }

    const ogPath = toOgPath(storagePath);

    // Check if OG version already exists
    const { data: existing } = await supabase.storage
      .from('article-images')
      .list('og', { search: ogPath.replace('og/', '') });

    if (existing && existing.length > 0) {
      console.log(`  SKIP (exists): ${ogPath}`);
      skipped++;
      continue;
    }

    try {
      const jpegBuffer = await processImage(article.featured_image_url);
      const sizeKB = (jpegBuffer.length / 1024).toFixed(1);

      const { error: uploadErr } = await supabase.storage
        .from('article-images')
        .upload(ogPath, jpegBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      console.log(`  OK: ${ogPath} (${sizeKB} KB) — ${article.slug}`);
      processed++;
    } catch (err: any) {
      console.error(`  FAIL: ${article.slug} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
}

main();
