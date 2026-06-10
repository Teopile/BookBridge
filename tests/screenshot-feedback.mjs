// Quick visual check for the stakeholder-feedback work. Screenshots key pages
// at desktop + mobile sizes into test-screenshots/ (gitignored).
// Usage: node screenshot-feedback.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = new URL('../test-screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['home', '/ka'],
  ['schools', '/ka/schools'],
  ['school-detail', '/ka/schools/ba168274-2474-4008-bab7-a20228cc2314'],
  ['donate-gate', '/ka/donate'],
  ['about', '/ka/about'],
  ['how', '/ka/how-it-works'],
  ['search', '/ka/search'],
  ['auth', '/ka/auth'],
];

const browser = await chromium.launch();
for (const [w, h, tag] of [[1920, 1080, 'desktop'], [390, 844, 'mobile']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  for (const [name, path] of PAGES) {
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}${name}-${tag}.png`, fullPage: false });
      console.log(`ok ${name}-${tag}`);
    } catch (e) {
      console.log(`FAIL ${name}-${tag}: ${e.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
}
await browser.close();
