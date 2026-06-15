// Rasterize the burgundy/cream brand SVGs into every PNG the site ships.
// Run from tests/:  node gen-icons.mjs
// Source masters live in frontend/public: app-icon.svg (rounded, transparent
// corners) and maskable.svg (full-bleed). OG card is composed inline with the
// real wordmark lockup + Georgian tagline.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const PUB = new URL('../frontend/public/', import.meta.url);
const p = (name) => new URL(name, PUB).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (name) => readFileSync(p(name), 'utf8');

const appIcon = read('app-icon.svg');
const maskable = read('maskable.svg');
// Wordmark lockup recolored burgundy for the cream OG card.
const lockupBurgundy = read('logo.svg').replaceAll('#2E2127', '#4D1E2E');

const browser = await chromium.launch();

async function rasterize(svg, size, out, { transparent }) {
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf8"><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px}</style>${sized}`, { waitUntil: 'load' });
  await page.screenshot({ path: p(out), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log(`OK ${out} (${size}x${size})`);
}

// Rounded, transparent-corner icons (browser tabs + PWA "any").
await rasterize(appIcon, 16, 'favicon-16.png', { transparent: true });
await rasterize(appIcon, 32, 'favicon-32.png', { transparent: true });
await rasterize(appIcon, 192, 'icon-192.png', { transparent: true });
await rasterize(appIcon, 512, 'icon-512.png', { transparent: true });
// Opaque, full-bleed (iOS masks its own corners; Android maskable safe-zone).
await rasterize(maskable, 180, 'apple-touch-icon.png', { transparent: false });
await rasterize(maskable, 512, 'icon-maskable-512.png', { transparent: false });

// Social card 1200x630 - cream ground, burgundy lockup, Georgian tagline.
const ogW = 1200, ogH = 630;
const ogHtml = `<!doctype html><html lang="ka"><head><meta charset="utf8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Georgian:wght@500;600&family=Noto+Sans+Georgian:wght@500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${ogW}px;height:${ogH}px}
  body{background:#EADFCB;display:flex;flex-direction:column;align-items:center;justify-content:center;
       gap:34px;font-family:'Noto Serif Georgian',Georgia,serif;position:relative}
  .edge{position:absolute;left:0;right:0;height:14px;background:#4D1E2E}
  .edge.t{top:0}.edge.b{bottom:0}
  .lockup{width:620px;height:auto;display:block}
  .tag{font-size:40px;font-weight:600;color:#4D1E2E;letter-spacing:.01em}
  .sub{font-family:'Noto Sans Georgian',sans-serif;font-size:24px;font-weight:500;color:#5C4D50;letter-spacing:.02em}
  .rule{width:120px;height:3px;background:#006E91;border-radius:2px}
</style></head>
<body>
  <div class="edge t"></div>
  <div class="lockup">${lockupBurgundy.replace('<svg ', '<svg width="620" ')}</div>
  <div class="rule"></div>
  <div class="tag">შენს წიგნს ელიან მთაში</div>
  <div class="sub">Your book is awaited in the mountains</div>
  <div class="edge b"></div>
</body></html>`;
const ogPage = await browser.newPage({ viewport: { width: ogW, height: ogH }, deviceScaleFactor: 1 });
await ogPage.setContent(ogHtml, { waitUntil: 'networkidle' });
await ogPage.evaluate(() => document.fonts.ready);
await ogPage.waitForTimeout(400);
await ogPage.screenshot({ path: p('og-image.png'), clip: { x: 0, y: 0, width: ogW, height: ogH } });
console.log('OK og-image.png (1200x630)');

await browser.close();
console.log('all icons regenerated');
