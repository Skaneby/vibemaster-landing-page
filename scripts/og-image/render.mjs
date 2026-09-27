// Renders scripts/og-image/og-image.html to assets/images/og-image.png (1200x630).
// Usage: node scripts/og-image/render.mjs [--guide]
// Requires Playwright with Chromium (npx playwright install chromium).
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const guide = process.argv.includes('--guide');
const src = pathToFileURL(path.join(here, 'og-image.html')).href + (guide ? '?guide' : '');
const out = guide
  ? path.join(here, 'og-image-guide.png')
  : path.join(here, '..', '..', 'assets', 'images', 'og-image.png');

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(src, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log(`Wrote ${out}`);
