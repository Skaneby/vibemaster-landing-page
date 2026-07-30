#!/usr/bin/env node
// Generates assets/og/vibemaster-og.png (1200x630 — the standard Open
// Graph / Twitter Card size). Deliberately language-neutral (no long
// English sentence baked into the pixels) so the same image reads fine
// regardless of which locale's link is being shared — the actual
// og:title/og:description text is what's localized per page.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const htmlPath = join(__dirname, '.og-image-source.html');
const outPath = join(ROOT, 'assets', 'og', 'vibemaster-og.png');

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #FDFCF0;
  }
  .sheen {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 900px 500px at 80% 25%, rgba(224, 207, 155, 0.24), transparent 65%),
      radial-gradient(ellipse 800px 450px at 12% 88%, rgba(107, 122, 47, 0.12), transparent 60%),
      linear-gradient(180deg, #FDFCF0 0%, #F5F5E6 55%, #EBEBD5 100%);
  }
  /* No grain texture here (unlike the FB cover): fine noise defeats PNG
     compression and this asset is fetched by every social-share crawler,
     so file size matters more than the extra texture is worth at this
     small, briefly-glimpsed size. */
  .wrap {
    position: relative; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 28px;
  }
  .brand { display: flex; align-items: center; gap: 20px; }
  .logo {
    width: 88px; height: 88px;
    background: #1E2113; color: #FAFAEB;
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(30,33,19,0.2);
  }
  .logo svg { width: 48px; height: 48px; }
  .name { font-weight: 900; font-size: 64px; letter-spacing: -0.02em; color: #1E2113; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px; font-weight: 600;
    letter-spacing: 0.32em; text-transform: uppercase;
    color: #755E31;
  }
  .url {
    position: absolute; left: 64px; bottom: 48px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500; font-size: 18px;
    color: #4E5340;
  }
</style>
</head><body>
  <div class="sheen"></div>
  <div class="wrap">
    <div class="brand">
      <span class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 10 6l4 8 6-12"/></svg>
      </span>
      <span class="name">Vibemaster</span>
    </div>
    <div class="eyebrow">Idea &nbsp;→&nbsp; Spec &nbsp;→&nbsp; Build</div>
  </div>
  <div class="url">vibemaster.ai</div>
</body></html>
`;

const { writeFileSync, mkdirSync, unlinkSync } = await import('node:fs');
writeFileSync(htmlPath, html);
mkdirSync(join(ROOT, 'assets', 'og'), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(150);
await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
unlinkSync(htmlPath);
console.log('wrote', outPath);
