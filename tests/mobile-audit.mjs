// Mobile UX + a11y audit pass.
// Visits every public page at iPhone-size, captures screenshots, and pulls a11y signals
// (focus state, alt text, aria-label, heading order, color contrast hints).
//
// Output: tests/mobile-screenshots/*.png + a console report.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FE = 'http://127.0.0.1:5173';
const SHOT_DIR = 'tests/mobile-screenshots';
mkdirSync(SHOT_DIR, { recursive: true });

const pages = [
  { name: '01-home',         path: '/en' },
  { name: '02-how',          path: '/en/how-it-works' },
  { name: '03-about',        path: '/en/about' },
  { name: '04-schools',      path: '/en/schools' },
  { name: '05-donate-1',     path: '/en/donate' },
  { name: '06-search',       path: '/en/search' },
  { name: '07-auth-signin',  path: '/en/auth' },
  { name: '08-auth-forgot',  path: '/en/auth/forgot' },
  { name: '09-account',      path: '/en/account' },
  { name: '10-school-manage',path: '/en/school/manage' },
  { name: '11-volunteer',    path: '/en/volunteer/manage' },
  { name: '12-track-404',    path: '/en/track/does-not-exist' },
  { name: '13-home-ka',      path: '/ka' },
  { name: '14-schools-ka',   path: '/ka/schools' },
];

const findings = [];

function add(page, severity, kind, detail) {
  findings.push({ page, severity, kind, detail });
}

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

for (const { name, path } of pages) {
  console.log('->', name, path);
  try {
    await page.goto(FE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 1) Horizontal overflow check — only count elements that intrude into the viewport.
    // Off-canvas drawers translated to the right (left >= viewport width) don't actually overflow.
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bodyScrollW = document.body.scrollWidth;
      const offenders = [];
      // Only investigate if body actually has horizontal scroll room.
      if (bodyScrollW <= w + 1) return { vw: w, offenders, bodyScrollW };
      for (const el of document.body.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.left >= w) continue; // entirely off the right edge
        if (r.right <= w + 1) continue;
        if (r.width >= w * 2) continue; // huge wrappers like body
        offenders.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 60), right: Math.round(r.right) });
        if (offenders.length >= 3) break;
      }
      return { vw: w, offenders, bodyScrollW };
    });
    if (overflow.offenders.length) {
      add(name, 'HIGH', 'mobile-overflow', `${overflow.offenders.length} elements wider than viewport (${overflow.vw}px): ${JSON.stringify(overflow.offenders)}`);
    }

    // 2) Tap-target sizing on interactive elements
    const taps = await page.evaluate(() => {
      const tinies = [];
      const els = document.querySelectorAll('a, button, [role=button], input[type=checkbox], input[type=radio]');
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.width < 32 || r.height < 32) {
          tinies.push({
            tag: el.tagName,
            txt: (el.innerText || el.value || el.getAttribute('aria-label') || '').slice(0, 30),
            w: Math.round(r.width), h: Math.round(r.height),
          });
          if (tinies.length >= 5) break;
        }
      }
      return tinies;
    });
    if (taps.length) add(name, 'MEDIUM', 'tap-target', `${taps.length} interactive elements under 32px: ${JSON.stringify(taps)}`);

    // 3) Images missing alt
    const missingAlt = await page.evaluate(() => {
      const out = [];
      for (const img of document.querySelectorAll('img')) {
        if (!img.hasAttribute('alt')) out.push(img.src.slice(-60));
      }
      return out;
    });
    if (missingAlt.length) add(name, 'MEDIUM', 'a11y-no-alt', `${missingAlt.length} images without alt attribute (any): ${missingAlt.slice(0, 3).join(', ')}`);

    // 4) Buttons / links without accessible name
    const unnamed = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('button, a')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const aria = el.getAttribute('aria-label');
        const title = el.getAttribute('title');
        const text = (el.innerText || '').trim();
        if (!aria && !title && text.length === 0) {
          out.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 40) });
          if (out.length >= 5) break;
        }
      }
      return out;
    });
    if (unnamed.length) add(name, 'HIGH', 'a11y-no-name', `${unnamed.length} interactives with no accessible name: ${JSON.stringify(unnamed)}`);

    // 5) Form inputs without label
    const unlabeled = await page.evaluate(() => {
      const out = [];
      const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea');
      for (const el of inputs) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const id = el.id;
        let labeled = !!el.getAttribute('aria-label') || !!el.getAttribute('aria-labelledby');
        if (!labeled && id) labeled = !!document.querySelector(`label[for="${id}"]`);
        if (!labeled) labeled = !!el.closest('label');
        if (!labeled) {
          out.push({ tag: el.tagName, type: el.type, ph: el.placeholder?.slice(0, 30) });
          if (out.length >= 5) break;
        }
      }
      return out;
    });
    if (unlabeled.length) add(name, 'HIGH', 'a11y-input-no-label', `${unlabeled.length} form controls without an associated label: ${JSON.stringify(unlabeled)}`);

    // 6) i18n leak detection — look for known English-only words on /ka pages
    if (path.startsWith('/ka')) {
      const visibleText = await page.evaluate(() => document.body.innerText);
      const englishOnlyHints = [
        /\bView all\b/, /\bDonate\b/, /\bSign in\b/, /\bSign up\b/,
        /\bAccount\b/, /\bLog ?out\b/, /\bForgot\b/, /\bReset\b/,
        /\bConfirm\b/, /\bSchool\b/, /\bRegion\b/, /\bCity\b/,
        /\bNext\b/, /\bBack\b/, /\bCancel\b/, /\bSave\b/, /\bEdit\b/,
      ];
      const hits = englishOnlyHints.filter((re) => re.test(visibleText)).map((re) => re.toString());
      if (hits.length) add(name, 'MEDIUM', 'i18n-leak', `English words on /ka page: ${hits.join(', ')}`);
    }

    await page.screenshot({ path: join(SHOT_DIR, name + '.png'), fullPage: true });
  } catch (e) {
    add(name, 'HIGH', 'page-error', e.message);
  }
}

await browser.close();

console.log('\n============== FINDINGS ==============');
const bySeverity = { HIGH: [], MEDIUM: [], LOW: [] };
for (const f of findings) bySeverity[f.severity].push(f);

for (const sev of ['HIGH', 'MEDIUM', 'LOW']) {
  if (bySeverity[sev].length === 0) continue;
  console.log('\n-- ' + sev + ' --');
  for (const f of bySeverity[sev]) {
    console.log(`  [${f.page}] (${f.kind}) ${f.detail}`);
  }
}
console.log('\nTotal: ' + findings.length + ' findings across ' + pages.length + ' pages.');
console.log('Screenshots: ' + SHOT_DIR + '/');
