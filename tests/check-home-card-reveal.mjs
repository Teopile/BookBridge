// Behavioral check for the Home "Schools waiting now" hover reveal.
// Usage: node check-home-card-reveal.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const browser = await chromium.launch();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(BASE + '/ka', { waitUntil: 'networkidle', timeout: 30000 });
const cards = page.locator('article.school--home');
await cards.first().waitFor({ state: 'visible', timeout: 20000 });
const first = cards.first();
const details = first.locator('.school-details');
const photo = first.locator('.school-photo');

// Bring the schools section into view so hover coordinates are valid.
await first.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

console.log('details in DOM while collapsed:', (await details.count()) === 1 ? 'YES' : 'NO');
console.log('collapsed details height:', (await details.boundingBox())?.height ?? -1);

// Record NEIGHBOR footprints before hover (exclude the hovered card itself,
// which intentionally lifts via translateY(-3px) — a compositor transform that
// does not reflow the grid). Plus the hovered card's own height.
const n = await cards.count();
const neighborsBefore = [];
for (let i = 1; i < n; i++) neighborsBefore.push(await cards.nth(i).boundingBox());
const ownHeightBefore = (await first.boundingBox()).height;

await first.hover();
await page.waitForTimeout(450);
const ph = (await photo.boundingBox()).height;
const dh = (await details.boundingBox()).height;
const cta = first.locator('.school-details-cta');
const ctaBox = await cta.boundingBox();
const cardBox = await first.boundingBox();
const ctaInside = ctaBox && (ctaBox.y + ctaBox.height) <= (cardBox.y + cardBox.height + 1);
console.log('hover: photo h =', ph, '| details h =', dh, '| gold CTA visible:', await cta.isVisible(), '| CTA not clipped:', ctaInside);

let moved = 0;
for (let i = 1; i < n; i++) {
  const now = await cards.nth(i).boundingBox();
  const was = neighborsBefore[i - 1];
  if (Math.abs(now.x - was.x) > 0.5 || Math.abs(now.y - was.y) > 0.5 || Math.abs(now.height - was.height) > 1) moved++;
}
const ownHeightAfter = (await first.boundingBox()).height;
console.log('neighbors moved during hover:', moved === 0 ? 'NONE (zero reflow)' : moved);
console.log('hovered card footprint stable:', Math.abs(ownHeightAfter - ownHeightBefore) <= 1 ? 'YES' : `NO (${ownHeightBefore} -> ${ownHeightAfter})`);
await page.screenshot({ path: '../test-screenshots/home-card-reveal-hover.png' });

await page.mouse.move(5, 5);
await page.waitForTimeout(450);
console.log('reverses on mouse-out:', ((await details.boundingBox())?.height ?? 0) < 2 ? 'YES' : 'NO');

// CTA -> donate; card body -> detail.
await first.scrollIntoViewIfNeeded();
await first.hover();
await page.waitForTimeout(400);
await cta.click();
await page.waitForTimeout(600);
console.log('gold CTA -> donate:', /\/ka\/donate\?school=/.test(page.url()) ? 'YES' : 'NO (' + page.url() + ')');
await page.goBack({ waitUntil: 'networkidle' });

// Re-query after navigation — the grid re-renders, and Home swaps its sample
// schools for live data on mount (a remount). Let that settle before grabbing.
const cardsAgain = page.locator('article.school--home');
await cardsAgain.first().waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(1200);
await cardsAgain.first().scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const body = await cardsAgain.first().locator('.school-region').boundingBox();
await page.mouse.click(body.x + body.width / 2, body.y + body.height / 2);
await page.waitForTimeout(600);
console.log('card body -> detail:', /\/ka\/schools\/[\w-]+$/.test(page.url()) ? 'YES' : 'NO (' + page.url() + ')');
await ctx.close();

// Touch: details permanently visible.
const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const tp = await touch.newPage();
await tp.goto(BASE + '/ka', { waitUntil: 'networkidle', timeout: 30000 });
await tp.locator('article.school--home').first().waitFor({ state: 'visible', timeout: 20000 });
const tb = await tp.locator('article.school--home').first().locator('.school-details').boundingBox();
console.log('touch: details permanently visible:', tb && tb.height > 80 ? 'YES' : 'NO (' + (tb && tb.height) + ')');
await touch.close();

// Reduced motion: instant reveal.
const rm = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1100 } });
const rp = await rm.newPage();
await rp.goto(BASE + '/ka', { waitUntil: 'networkidle', timeout: 30000 });
const rc = rp.locator('article.school--home').first();
await rc.waitFor({ state: 'visible', timeout: 20000 });
await rc.scrollIntoViewIfNeeded();
await rc.hover();
const rh = (await rc.locator('.school-details').boundingBox()).height;
console.log('reduced-motion instant reveal:', rh > 80 ? 'YES' : 'NO (' + rh + ')');
await rm.close();

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
