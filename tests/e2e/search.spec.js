import { test, expect } from 'playwright/test';
import { EN, waitForApp } from './helpers.js';

test.describe('Search', () => {
  test('search page browses all schools by default', async ({ page }) => {
    await page.goto(EN + '/search');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
    await expect(page.getByLabel('Search by name or region…')).toBeVisible();

    // With no query, Search.jsx browses /api/schools (50 live rows).
    const cards = page.locator('article.school');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('typing a query returns matching results', async ({ page }) => {
    await page.goto(EN + '/search');
    await waitForApp(page);

    // "ი" is an extremely common Georgian vowel; the /api/search endpoint
    // returns school hits for it (verified against the live API).
    const box = page.getByLabel('Search by name or region…');
    await box.fill('ი');

    // Debounced 250ms fetch -> results header "Schools · N" + school cards.
    const cards = page.locator('article.school');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('a nonsense query shows the empty state', async ({ page }) => {
    await page.goto(EN + '/search');
    await waitForApp(page);

    await page
      .getByLabel('Search by name or region…')
      .fill('zzzqqqxx-no-such-school-12345');

    // Search.jsx renders the "No schools found" empty state on zero hits.
    await expect(page.getByText('No schools found')).toBeVisible({ timeout: 20_000 });
  });

  test('filter pills are present and toggle', async ({ page }) => {
    await page.goto(EN + '/search');
    await waitForApp(page);

    const beneficiary = page.getByRole('button', { name: 'Beneficiary' });
    await expect(beneficiary).toBeVisible();
    await beneficiary.click();
    await expect(beneficiary).toHaveClass(/active/);
  });
});
