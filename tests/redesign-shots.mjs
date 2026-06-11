// Screenshot every page at 375 / 768 / 1440 for the redesign audit.
// Usage: node redesign-shots.mjs [outDirName] [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '../test-screenshots/' + (process.argv[2] || 'redesign-before') + '/';
const BASE = process.argv[3] || 'http://localhost:5173';
mkdirSync(new URL(OUT, import.meta.url), { recursive: true });

const PAGES = [
  ['home', '/ka'],
  ['schools', '/ka/schools'],
  ['school-detail', '/ka/schools/ba168274-2474-4008-bab7-a20228cc2314'],
  ['stories', '/ka/stories'],
  ['about', '/ka/about'],
  ['how', '/ka/how-it-works'],
  ['search', '/ka/search'],
  ['donate-gate', '/ka/donate'],
  ['auth', '/ka/auth'],
  ['auth-forgot', '/ka/auth/forgot'],
  ['account-signedout', '/ka/account'],
  ['track-error', '/ka/track/not-a-real-token'],
  ['privacy', '/ka/privacy'],
  ['dashboard', '/ka/dashboard'],
  ['notfound', '/ka/no-such-page'],
  ['home-en', '/en'],
];

const WIDTHS = [[375, 812], [768, 1024], [1440, 950]];

const browser = await chromium.launch();
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  // Hide the cookie banner so it doesn't cover every shot.
  await page.addInitScript(() => localStorage.setItem('bb_cookie_consent', '1'));
  for (const [name, path] of PAGES) {
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(900);
      await page.screenshot({ path: new URL(`${OUT}${name}-${w}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
      console.log(`ok ${name}-${w}`);
    } catch (e) {
      console.log(`FAIL ${name}-${w}: ${e.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
}
await browser.close();
