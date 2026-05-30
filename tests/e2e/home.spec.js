import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

test.describe('Home page', () => {
  test('root redirects to /en and renders the hero', async ({ page }) => {
    await page.goto('/');
    // App.jsx: "/" -> <Navigate to="/en" replace />
    await expect(page).toHaveURL(/\/en$/);
    await waitForApp(page);

    // Hero headline (real copy from en.js).
    await expect(
      page.getByRole('heading', { level: 1, name: COPY.heroTitle }),
    ).toBeVisible();
    await expect(page.getByText(COPY.heroSub)).toBeVisible();
  });

  test('hero CTAs link to donate and schools', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    const donateCta = page.getByRole('link', { name: COPY.ctaPrimary }).first();
    const schoolsCta = page.getByRole('link', { name: COPY.ctaSecondary }).first();

    await expect(donateCta).toBeVisible();
    await expect(donateCta).toHaveAttribute('href', /\/en\/donate$/);
    await expect(schoolsCta).toHaveAttribute('href', /\/en\/schools$/);
  });

  test('renders the big stat number and section headings', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    // The "one big number" block. Live data is 0 books / 50 schools, but the
    // component may briefly show its 5,100 fallback before /api/stats resolves.
    // Assert structurally: the number element exists and shows digits, and the
    // label mentions "schools".
    const bignum = page.locator('.bignum-n');
    await expect(bignum).toBeVisible();
    await expect(bignum).toHaveText(/[0-9]/);

    await expect(page.locator('.bignum-l')).toContainText('schools');

    // Section headings prove the page assembled fully.
    await expect(
      page.getByRole('heading', { name: COPY.howTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: COPY.schoolsTitle }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: COPY.topDonorsTitle }),
    ).toBeVisible();
  });

  test('"Schools waiting now" shows clickable school cards', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    // Home seeds 3 sample cards, then swaps to real schools when the API
    // returns rows. Either way there are school cards linking to /en/schools/:id.
    const cards = page.locator('a.school');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(cards.first()).toHaveAttribute('href', /\/en\/schools\//);
  });
});
