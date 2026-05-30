import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

// Georgian hero title from frontend/src/i18n/ka.js.
const KA_HERO_TITLE = 'შესწირე წიგნი მთის სკოლას.';

test.describe('Language switch (en <-> ka)', () => {
  test('toggles to Georgian and updates URL + <html lang>', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    await expect(page.getByRole('heading', { level: 1, name: COPY.heroTitle })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Nav.jsx renders a language pill labelled "Switch to Georgian" showing "KA".
    const toGeorgian = page.getByRole('button', { name: /Switch to Georgian/i });
    await expect(toGeorgian).toBeVisible();
    await toGeorgian.click();

    // setLang navigates /en -> /ka and re-renders the dictionary.
    await expect(page).toHaveURL(/\/ka$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
    await expect(page.getByRole('heading', { level: 1, name: KA_HERO_TITLE })).toBeVisible();
    // English hero copy is gone.
    await expect(page.getByText(COPY.heroTitle)).toHaveCount(0);
  });

  test('toggles back to English from Georgian', async ({ page }) => {
    await page.goto('/ka');
    await waitForApp(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');

    // On /ka the language pill's aria-label is Georgian ("ინგლისურზე გადართვა")
    // and its visible text is "EN". Target the stable .lang-pill element.
    const toEnglish = page.locator('.lang-pill');
    await expect(toEnglish).toHaveText('EN');
    await toEnglish.click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1, name: COPY.heroTitle })).toBeVisible();
  });

  test('language choice persists across navigation', async ({ page }) => {
    await page.goto('/ka');
    await waitForApp(page);

    // Click the Schools nav link; it should keep the /ka prefix.
    await page.getByRole('link', { name: 'სკოლები' }).first().click();
    await expect(page).toHaveURL(/\/ka\/schools$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  });
});
