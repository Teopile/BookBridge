// Behavioral check for the school-card hover reveal.
// Usage: node check-card-reveal.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const browser = await chromium.launch();

// ---------- Desktop: hover reveal, zero reflow, focus-within, CTA ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE + '/ka/schools', { waitUntil: 'networkidle', timeout: 30000 });
const cards = page.locator('article.school');
await cards.first().waitFor({ state: 'visible', timeout: 20000 });

const first = cards.first();
const details = first.locator('.school-details');
const photo = first.locator('.school-photo');

// Collapsed state: details present in DOM but zero height.
const collapsedH = (await details.boundingBox())?.height ?? -1;
const photoH = (await photo.boundingBox()).height;
console.log('collapsed: details h =', collapsedH, '| photo h =', photoH);
console.log('details kept in DOM while collapsed:', (await details.count()) === 1 ? 'YES' : 'NO');

// Record neighbor + self positions before hover.
const neighborBoxesBefore = [];
const n = Math.min(await cards.count(), 6);
for (let i = 1; i < n; i++) neighborBoxesBefore.push(await cards.nth(i).boundingBox());
const selfBefore = await first.boundingBox();

// Hover → photo shrinks, details expand.
await first.hover();
await page.waitForTimeout(450);
const hoverPhotoH = (await photo.boundingBox()).height;
const hoverDetailsH = (await details.boundingBox()).height;
const ctaVisible = await first.locator('.school-details-cta').isVisible();
console.log('hover: photo h =', hoverPhotoH, '| details h =', hoverDetailsH, '| CTA visible:', ctaVisible);
console.log('photo shrank:', hoverPhotoH < photoH ? 'YES' : 'NO');

// Zero reflow: neighbors (and the grid) must not have moved.
let moved = 0;
for (let i = 1; i < n; i++) {
  const now = await cards.nth(i).boundingBox();
  const was = neighborBoxesBefore[i - 1];
  if (Math.abs(now.x - was.x) > 0.5 || Math.abs(now.y - was.y) > 0.5 || Math.abs(now.height - was.height) > 0.5) moved++;
}
const selfNow = await first.boundingBox();
console.log('neighbors moved during hover:', moved === 0 ? 'NONE (zero reflow)' : moved);
console.log('own footprint stable:', Math.abs(selfNow.height - selfBefore.height) <= 4 ? 'YES' : `NO (${selfBefore.height} -> ${selfNow.height})`);
await page.screenshot({ path: '../test-screenshots/card-reveal-hover.png' });

// Mouse-out reverses.
await page.mouse.move(10, 10);
await page.waitForTimeout(450);
console.log('reverses on mouse-out:', ((await details.boundingBox())?.height ?? 0) < 2 ? 'YES' : 'NO');

// CTA navigates to donate (not the card link).
await first.hover();
await page.waitForTimeout(400);
await first.locator('.school-details-cta').click();
await page.waitForTimeout(600);
console.log('CTA goes to donate:', /\/ka\/donate\?school=/.test(page.url()) ? 'YES' : 'NO (' + page.url() + ')');
await page.goBack({ waitUntil: 'networkidle' });

// Card body click goes to detail. Raw mouse click: the pointer target is the
// stretched-link overlay (by design), which Playwright's locator.click()
// refuses as an "interceptor".
const bodyBox = await cards.first().locator('.school-region').boundingBox();
await page.mouse.click(bodyBox.x + bodyBox.width / 2, bodyBox.y + bodyBox.height / 2);
await page.waitForTimeout(600);
console.log('card click goes to detail:', /\/ka\/schools\/[0-9a-f-]+$/.test(page.url()) ? 'YES' : 'NO (' + page.url() + ')');
await page.goBack({ waitUntil: 'networkidle' });

// Keyboard: focusing the title link reveals (focus-within).
await cards.first().locator('h3 a').focus();
await page.waitForTimeout(400);
const focusDetailsH = (await cards.first().locator('.school-details').boundingBox()).height;
console.log('focus-within reveals:', focusDetailsH > 100 ? 'YES' : 'NO (' + focusDetailsH + ')');
await ctx.close();

// ---------- Touch (hover: none): details permanently visible ----------
const touch = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  // Force the (hover: none) media feature like a real touch device.
  ...({}),
});
const tp = await touch.newPage();
await tp.emulateMedia({ media: 'screen' });
// Playwright: hasTouch makes (hover: none), (pointer: coarse) match in Chromium.
await tp.goto(BASE + '/ka/schools', { waitUntil: 'networkidle', timeout: 30000 });
await tp.locator('article.school').first().waitFor({ state: 'visible', timeout: 20000 });
const tDetails = tp.locator('article.school').first().locator('.school-details');
const tBox = await tDetails.boundingBox();
console.log('touch: details permanently visible:', tBox && tBox.height > 100 ? 'YES' : 'NO (' + (tBox && tBox.height) + ')');
await tp.screenshot({ path: '../test-screenshots/card-reveal-touch.png' });
await touch.close();

// ---------- Reduced motion: instant reveal, no transition ----------
const rm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
const rp = await rm.newPage();
await rp.goto(BASE + '/ka/schools', { waitUntil: 'networkidle', timeout: 30000 });
await rp.locator('article.school').first().waitFor({ state: 'visible', timeout: 20000 });
const rCard = rp.locator('article.school').first();
await rCard.hover();
// No waiting: with transition:none the details must be at full height immediately.
const rH = (await rCard.locator('.school-details').boundingBox()).height;
console.log('reduced-motion instant reveal:', rH > 100 ? 'YES' : 'NO (' + rH + ')');
await rm.close();

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
