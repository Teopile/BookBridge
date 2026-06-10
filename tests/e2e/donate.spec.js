import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

// The donate flow is auth-gated at the START (stakeholder Task 2, MyHome
// pattern): a logged-out visitor sees the sign-in modal immediately — no form
// fields before auth. These tests verify the gate, intent preservation via
// ?next=, and the logged-in wizard internals are covered by unit/manual tests
// (submitting would require auth and would create real DB rows).

test.describe('Donate auth gate (logged out)', () => {
  test('opening /donate shows the auth modal immediately, no form fields', async ({ page }) => {
    await page.goto(EN + '/donate');
    await waitForApp(page);

    // The modal is up: dialog role, title, sign-in CTA, create-account link.
    // (Named lookup — the cookie-consent banner is also role="dialog".)
    const dialog = page.getByRole('dialog', { name: 'Sign in to donate a book' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Create one' })).toBeVisible();

    // No wizard form fields are rendered behind the gate.
    await expect(page.locator('select.wizard-select')).toHaveCount(0);
    await expect(page.locator('.wizard-step-pill')).toHaveCount(0);
  });

  test('the sign-in CTA carries a return-to (?next=) back into the flow', async ({ page }) => {
    await page.goto(EN + '/donate');
    await waitForApp(page);

    const signin = page.getByRole('dialog', { name: 'Sign in to donate a book' }).getByRole('link', { name: 'Sign in' });
    await expect(signin).toHaveAttribute('href', /\/en\/auth\?next=/);

    await signin.click();
    await expect(page).toHaveURL(/\/en\/auth\?next=%2Fen%2Fdonate/);
    // Auth page renders the sign-in form.
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('deep link with ?school= is preserved in the return-to', async ({ page, request }) => {
    const res = await request.get(
      'https://book-bridge-api.vercel.app/api/schools?type=beneficiary',
    );
    expect(res.ok()).toBeTruthy();
    const schools = await res.json();
    expect(schools.length).toBeGreaterThan(0);
    const id = schools[0].id;

    await page.goto(EN + '/donate?school=' + id);
    await waitForApp(page);

    const signin = page.getByRole('dialog', { name: 'Sign in to donate a book' }).getByRole('link', { name: 'Sign in' });
    const href = await signin.getAttribute('href');
    expect(decodeURIComponent(href)).toContain('/en/donate?school=' + id);
  });

  test('closing the modal returns the user to where they came from', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    // Navigate to /donate via the nav CTA, then close the gate.
    await page.locator('.nav-donate-cta').click();
    const dialog = page.getByRole('dialog', { name: 'Sign in to donate a book' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();

    // Back on the home page, app state intact.
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole('heading', { level: 1, name: COPY.heroTitle })).toBeVisible();
  });
});
