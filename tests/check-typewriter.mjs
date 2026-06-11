// Runtime check for the typewriter placeholder: animation progresses, focus
// hides it, blur+empty restores it, no console errors, mobile truncation.
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE + '/ka/schools', { waitUntil: 'networkidle', timeout: 20000 });
const overlay = page.locator('.tw-placeholder');
await overlay.waitFor({ state: 'visible', timeout: 5000 });

// 1. Animation progresses (text changes over time, terms cycle).
const t1 = await overlay.locator('.tw-text').innerText();
await page.waitForTimeout(1200);
const t2 = await overlay.locator('.tw-text').innerText();
await page.waitForTimeout(1500);
const t3 = await overlay.locator('.tw-text').innerText();
console.log('typed samples:', JSON.stringify([t1, t2, t3]));
console.log('animates:', t1 !== t2 || t2 !== t3 ? 'YES' : 'NO');
console.log('prefix:', await overlay.locator('.tw-prefix').innerText());
console.log('cursor visible:', await overlay.locator('.tw-cursor').isVisible());

// 2. Focus hides it instantly.
const input = page.getByLabel('ძებნა სახელით ან რეგიონით…');
await input.focus();
console.log('hidden on focus:', (await overlay.count()) === 0 ? 'YES' : 'NO');

// 3. Typing keeps it hidden even after blur.
await input.fill('გორი');
await input.blur();
console.log('hidden with value after blur:', (await overlay.count()) === 0 ? 'YES' : 'NO');

// 4. Clearing + blur brings it back.
await input.fill('');
await input.blur();
await page.waitForTimeout(300);
console.log('back when cleared+blurred:', (await overlay.count()) === 1 ? 'YES' : 'NO');

// 5. Navigation away (unmount) produces no errors.
await page.goto(BASE + '/ka/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// 6. Mobile width: no layout shift / overflow.
const mctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
const mp = await mctx.newPage();
mp.on('pageerror', (e) => errors.push(String(e)));
await mp.goto(BASE + '/ka/schools', { waitUntil: 'networkidle' });
const box = await mp.locator('.tw-placeholder').boundingBox();
const ibox = await mp.locator('.tw-input-wrap input').boundingBox();
console.log('mobile overlay within input:', box && ibox && box.width <= ibox.width + 1 ? 'YES' : 'NO');
await mp.screenshot({ path: '../test-screenshots/typewriter-mobile.png' });

// 7. Reduced motion: static first term, no cursor.
const rctx = await browser.newContext({ reducedMotion: 'reduce' });
const rp = await rctx.newPage();
await rp.goto(BASE + '/ka/schools', { waitUntil: 'networkidle' });
await rp.waitForTimeout(500);
const rtext = await rp.locator('.tw-text').innerText();
const rcursor = await rp.locator('.tw-cursor').count();
console.log('reduced-motion static text:', JSON.stringify(rtext), '| cursor elements:', rcursor);

console.log('console errors:', errors.length ? errors : 'none');
await page.screenshot({ path: '../test-screenshots/typewriter-desktop.png' });
await browser.close();
