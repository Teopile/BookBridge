import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

test.describe('Top navigation', () => {
  test('nav links route to the right pages', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    // Desktop nav-links: Schools / How it works / Stories / About / Search.
    await page.getByRole('link', { name: 'Schools' }).first().click();
    await expect(page).toHaveURL(/\/en\/schools$/);
    // Page title now lives in the SectionHero as the page h1.
    await expect(
      page.getByRole('heading', { level: 1, name: COPY.schoolsPageTitle, exact: true }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'How it works' }).first().click();
    await expect(page).toHaveURL(/\/en\/how-it-works$/);

    await page.getByRole('link', { name: 'Stories' }).first().click();
    await expect(page).toHaveURL(/\/en\/stories$/);

    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(page.getByRole('heading', { name: 'About BookBridge' })).toBeVisible();

    await page.getByRole('link', { name: 'Search' }).first().click();
    await expect(page).toHaveURL(/\/en\/search$/);
  });

  test('logo returns to home', async ({ page }) => {
    await page.goto(EN + '/about');
    await waitForApp(page);
    await page.getByRole('link', { name: 'BookBridge home' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole('heading', { level: 1, name: COPY.heroTitle })).toBeVisible();
  });

  test('unknown route shows the 404 page', async ({ page }) => {
    await page.goto(EN + '/this-route-does-not-exist');
    await waitForApp(page);
    await expect(page.getByText(COPY.notFoundBody)).toBeVisible();
  });
});

test.describe('Schools list + detail', () => {
  test('schools page loads real schools from the API', async ({ page }) => {
    await page.goto(EN + '/schools');
    await waitForApp(page);

    await expect(
      page.getByRole('heading', { level: 1, name: COPY.schoolsPageTitle, exact: true }),
    ).toBeVisible();

    // Search/filter bar is present (named via aria-label — the native
    // placeholder was replaced by the animated typewriter overlay).
    await expect(page.getByLabel('Search by name or region…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Beneficiary' })).toBeVisible();

    // Live DB has 50 beneficiary schools; cards render as <a class="school">
    // once /api/schools resolves (the page shows a brief loading/empty state first).
    const cards = page.locator('a.school');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    expect(await cards.count()).toBeGreaterThan(0);

    // Each card has a school-name heading and links to a detail route.
    await expect(cards.first().locator('h3')).not.toBeEmpty();
    await expect(cards.first()).toHaveAttribute('href', /\/en\/schools\//);
  });

  test('clicking a school opens its detail page', async ({ page }) => {
    await page.goto(EN + '/schools');
    await waitForApp(page);

    const firstCard = page.locator('a.school').first();
    await expect(firstCard).toBeVisible();
    const name = (await firstCard.locator('h3').innerText()).trim();

    await firstCard.click();
    await expect(page).toHaveURL(/\/en\/schools\/[0-9a-f-]+$/);

    // Detail page renders the school name as the <h1> and a "Donate" CTA.
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Donate' }).first()).toBeVisible();
    // "Back to all schools" link routes back to the list.
    await expect(
      page.getByRole('link', { name: /Back to all schools/i }).first(),
    ).toHaveAttribute('href', /\/en\/schools$/);
  });

  test('region filter dropdown is populated', async ({ page }) => {
    await page.goto(EN + '/schools');
    await waitForApp(page);

    // /api/regions returns real regions; the <select> has more than the
    // single "All regions" default option once it resolves.
    const regionSelect = page.getByRole('combobox');
    await expect(regionSelect).toBeVisible();
    await expect
      .poll(async () => regionSelect.locator('option').count())
      .toBeGreaterThan(1);
  });
});
