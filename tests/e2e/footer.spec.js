import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

test.describe('Footer', () => {
  test('renders brand, columns, and copyright', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Column headings + copyright (real copy from en.js footer.*).
    await expect(footer.getByRole('heading', { name: 'Platform' })).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Company' })).toBeVisible();
    await expect(footer.getByText(COPY.footerRights)).toBeVisible();

    // Contact mailto link.
    await expect(
      footer.getByRole('link', { name: 'info@bookbridge.ge' }),
    ).toHaveAttribute('href', 'mailto:info@bookbridge.ge');
  });

  test('footer platform links route correctly', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);

    const footer = page.locator('footer');

    await expect(
      footer.getByRole('link', { name: 'Find schools' }),
    ).toHaveAttribute('href', /\/en\/schools$/);
    await expect(
      footer.getByRole('link', { name: 'Donate a book' }).first(),
    ).toHaveAttribute('href', /\/en\/donate$/);
    await expect(
      footer.getByRole('link', { name: 'How it works' }),
    ).toHaveAttribute('href', /\/en\/how-it-works$/);

    // Navigate via a footer link and confirm it lands.
    await footer.getByRole('link', { name: 'Find schools' }).click();
    await expect(page).toHaveURL(/\/en\/schools$/);
  });

  test('marketing footer CTA shows on home, hidden on auth', async ({ page }) => {
    await page.goto(EN);
    await waitForApp(page);
    // shouldShowFooterCta -> true on home.
    await expect(page.locator('.footer-cta')).toBeVisible();
    await expect(page.locator('.footer-cta').getByText('Send a book today.')).toBeVisible();

    await page.goto(EN + '/auth');
    await waitForApp(page);
    // shouldShowFooterCta -> false on /auth.
    await expect(page.locator('.footer-cta')).toHaveCount(0);
  });
});
