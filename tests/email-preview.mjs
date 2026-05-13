// Render every BookBridge email template to HTML files + capture preview
// screenshots in Chromium. Verifies what real recipients see *before* sending.
//
// Renders:
//   - the 5 server templates from server/lib/mailer.js (EN + KA each)
//   - the 2 Supabase Auth HTML templates (signup, reset) with {{ .Token }} substituted
//
// Output: tests/email-previews/*.html  +  tests/email-previews/*.png

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Templates } from '../server/lib/mailer.js';

const OUT = 'tests/email-previews';
mkdirSync(OUT, { recursive: true });

const SAMPLE_DONATION_ID = 'a1b2c3d4-5e6f-7890-abcd-ef1234567890';
const SAMPLE_TRACK_URL   = 'https://bookbridge.ge/en/track/sample-track-token-12345';
const SAMPLE_SCHOOL_NAME = 'Adigeni Mountain School #4';

const cases = [];

for (const lang of ['en', 'ka']) {
  cases.push({
    file: `01-registration-${lang}`,
    label: `Registration (${lang})`,
    tpl: Templates.registration({ fullName: lang === 'ka' ? 'თეო' : 'Teo', lang }),
  });
  cases.push({
    file: `02-donation-confirmed-${lang}`,
    label: `Donation confirmed (${lang})`,
    tpl: Templates.donationConfirmed({ donationId: SAMPLE_DONATION_ID, trackUrl: SAMPLE_TRACK_URL, lang }),
  });
  cases.push({
    file: `03-status-changed-${lang}`,
    label: `Status changed -> in_transit (${lang})`,
    tpl: Templates.statusChanged({ donationId: SAMPLE_DONATION_ID, status: 'in_transit', trackUrl: SAMPLE_TRACK_URL, lang }),
  });
  cases.push({
    file: `04-delivered-${lang}`,
    label: `Donation delivered (${lang})`,
    tpl: Templates.donationDelivered({ donationId: SAMPLE_DONATION_ID, schoolName: SAMPLE_SCHOOL_NAME, trackUrl: SAMPLE_TRACK_URL, lang }),
  });
  cases.push({
    file: `05-monetary-${lang}`,
    label: `Monetary receipt (${lang})`,
    tpl: Templates.monetaryReceipt({ amountMinor: 5000, currency: 'GEL', lang }),
  });
}

function readSupabaseTemplate(filename) {
  const raw = readFileSync(join('docs/email-templates/supabase', filename), 'utf-8');
  return raw
    .replace(/\{\{\s*\.Token\s*\}\}/g, '482917')
    .replace(/\{\{\s*\.Email\s*\}\}/g, 'donor@example.com')
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, 'https://bookbridge.ge')
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, 'https://bookbridge.ge/en/auth?token=482917');
}

cases.push({
  file: '06-supabase-signup-confirm',
  label: 'Supabase: confirm signup (rendered with token=482917)',
  tpl: {
    subject: 'Confirm your BookBridge account — 482917',
    html: readSupabaseTemplate('signup-confirm.html'),
    text: '',
  },
});
cases.push({
  file: '07-supabase-reset-password',
  label: 'Supabase: reset password (rendered with token=482917)',
  tpl: {
    subject: 'Your BookBridge password reset code — 482917',
    html: readSupabaseTemplate('reset-password.html'),
    text: '',
  },
});

console.log(`Rendering ${cases.length} email templates...`);

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 700, height: 900 } });
const page = await ctx.newPage();

const reportLines = ['# Email template preview\n'];
reportLines.push('| File | Subject | HTML size | Text size |');
reportLines.push('|------|---------|-----------|-----------|');

for (const { file, label, tpl } of cases) {
  const htmlPath = join(OUT, file + '.html');
  writeFileSync(htmlPath, tpl.html);

  const fileUrl = pathToFileURL(resolve(htmlPath)).href;

  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(fileUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, file + '-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 380, height: 700 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(OUT, file + '-mobile.png'), fullPage: true });

  const htmlBytes = tpl.html.length;
  const textBytes = (tpl.text || '').length;
  reportLines.push(`| ${file} | ${tpl.subject.slice(0, 60)} | ${htmlBytes} B | ${textBytes} B |`);
  console.log(`  + ${label}  html=${htmlBytes}B text=${textBytes}B`);
}

writeFileSync(join(OUT, 'index.md'), reportLines.join('\n') + '\n');

await page.setViewportSize({ width: 700, height: 900 });
await page.goto(pathToFileURL(resolve(join(OUT, cases[0].file + '.html'))).href);
console.log(`\nAll previews written to ${OUT}/`);
console.log('Browser will stay open 10 seconds so you can flip through them.');
await page.waitForTimeout(10000);
await browser.close();
