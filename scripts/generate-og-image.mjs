#!/usr/bin/env node
/**
 * Generate the OG image (public/og-image.png) from the SVG template + project logo.
 *
 * Usage:
 *   node scripts/generate-og-image.mjs
 *   node scripts/generate-og-image.mjs --demos 35   # override demo count
 *
 * Requirements:
 *   npm install sharp  (already a transitive dependency via @astrojs/sitemap or install globally)
 *
 * What it does:
 *   1. Reads public/og-image.svg (the template with text, tags, and background)
 *   2. Replaces the demo count placeholder if --demos is provided
 *   3. Composites public/logos/logo-dark.png on top (centered)
 *   4. Outputs public/og-image.png at 1200×630
 *
 * When to regenerate:
 *   - After adding new demos (update the "28 interactive demos" text in og-image.svg)
 *   - After changing the logo
 *   - After modifying the SVG template
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const SVG_PATH = resolve(ROOT, 'public/og-image.svg');
const LOGO_PATH = resolve(ROOT, 'public/logos/logo-dark.png');
const OUTPUT_PATH = resolve(ROOT, 'public/og-image.png');

// Parse --demos flag
const demosArg = process.argv.find(a => a.startsWith('--demos'));
const demosCount = demosArg ? demosArg.split('=')[1] || process.argv[process.argv.indexOf(demosArg) + 1] : null;

async function generate() {
  let svgContent = readFileSync(SVG_PATH, 'utf-8');

  // Replace demo count if provided
  if (demosCount) {
    svgContent = svgContent.replace(/\d+ interactive demos/, `${demosCount} interactive demos`);
    // Also update the SVG file on disk so it stays in sync
    writeFileSync(SVG_PATH, svgContent, 'utf-8');
    console.log(`Updated demo count to ${demosCount}`);
  }

  // Render SVG to PNG buffer
  const base = await sharp(Buffer.from(svgContent))
    .resize(1200, 630)
    .png()
    .toBuffer();

  // Resize logo
  const logo = await sharp(LOGO_PATH)
    .resize(460, null, { fit: 'inside' })
    .toBuffer();

  const logoMeta = await sharp(logo).metadata();
  const logoX = Math.round((1200 - logoMeta.width) / 2);
  const logoY = 150;

  // Composite logo onto base
  await sharp(base)
    .composite([{ input: logo, left: logoX, top: logoY }])
    .png({ quality: 90 })
    .toFile(OUTPUT_PATH);

  const stats = await sharp(OUTPUT_PATH).metadata();
  console.log(`Generated: ${OUTPUT_PATH}`);
  console.log(`  Size: ${stats.width}×${stats.height}, ~${Math.round(stats.size / 1024)}KB`);
}

generate().catch(err => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});
