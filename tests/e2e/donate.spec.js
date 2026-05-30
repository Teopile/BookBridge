import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

// NOTE: these tests deliberately STOP before submitting a donation.
// Submitting would require auth and would create real DB rows. We only verify
// the wizard opens, renders its steps, and gates "Next" correctly.

test.describe('Donate wizard', () => {
  test('opens on step 1 with the school picker', async ({ page }) => {
    await page.goto(EN + '/donate');
    await waitForApp(page);

    // Wizard banner shows "Step 1 of 4" and the step-1 heading.
    await expect(page.getByText(/Step 1 of 4/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: COPY.donateStep1 }),
    ).toBeVisible();
    await expect(page.getByText('Pick which school you want to support.')).toBeVisible();

    // The 4-pill progress bar exists.
    await expect(page.locator('.wizard-step-pill')).toHaveCount(4);

    // School <select> is populated from /api/schools?type=beneficiary.
    const select = page.locator('select.wizard-select');
    await expect(select).toBeVisible();
    await expect
      .poll(async () => select.locator('option').count())
      .toBeGreaterThan(1);
  });

  test('"Next" is disabled until a school is chosen, then advances to step 2', async ({ page }) => {
    await page.goto(EN + '/donate');
    await waitForApp(page);

    const next = page.getByRole('button', { name: /Next/ });
    await expect(next).toBeVisible();
    await expect(next).toBeDisabled();

    // Pick the first real school option (index 0 is the "— Choose a school —" placeholder).
    const select = page.locator('select.wizard-select');
    await expect
      .poll(async () => select.locator('option').count())
      .toBeGreaterThan(1);
    await select.selectOption({ index: 1 });

    await expect(next).toBeEnabled();
    await next.click();

    // Step 2: "Pick books".
    await expect(page.getByText(/Step 2 of 4/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: COPY.donateStep2 }),
    ).toBeVisible();
    // Step 2 offers an "Add a book" custom-entry button.
    await expect(page.getByRole('button', { name: /Add a book/i })).toBeVisible();
  });

  test('deep link with ?school= preselects and the wizard still renders', async ({ page, request }) => {
    // Grab a real beneficiary school id from the live API.
    const res = await request.get(
      'https://book-bridge-api.vercel.app/api/schools?type=beneficiary',
    );
    expect(res.ok()).toBeTruthy();
    const schools = await res.json();
    expect(schools.length).toBeGreaterThan(0);
    const id = schools[0].id;

    await page.goto(EN + '/donate?school=' + id);
    await waitForApp(page);

    // Still on step 1, but a school is preselected so "Next" is enabled.
    await expect(page.getByText(/Step 1 of 4/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/ })).toBeEnabled();
  });
});
