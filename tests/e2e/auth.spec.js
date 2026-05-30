import { test, expect } from 'playwright/test';
import { EN, COPY, waitForApp } from './helpers.js';

// These tests render and toggle auth UI states only. They do NOT submit real
// credentials or create accounts.

test.describe('Auth page', () => {
  test('renders the sign-in form by default', async ({ page }) => {
    await page.goto(EN + '/auth');
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: COPY.authSignin })).toBeVisible();
    await expect(page.locator('#signin-email')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
  });

  test('toggles to the sign-up form', async ({ page }) => {
    await page.goto(EN + '/auth');
    await waitForApp(page);

    // "New to BookBridge?  Create account" toggle button.
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
      page.getByRole('heading', { name: COPY.authCreateAccount }),
    ).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-username')).toBeVisible();
    await expect(page.locator('#signup-password')).toBeVisible();
  });

  test('client-side validation blocks an empty sign-in submit', async ({ page }) => {
    await page.goto(EN + '/auth');
    await waitForApp(page);

    await page.getByRole('button', { name: 'Sign in' }).click();

    // Required email field is invalid -> browser blocks submit, stays on /auth.
    await expect(page).toHaveURL(/\/en\/auth$/);
    const emailValid = await page
      .locator('#signin-email')
      .evaluate((el) => el.checkValidity());
    expect(emailValid).toBe(false);
  });

  test('forgot-password page renders its reset form', async ({ page }) => {
    await page.goto(EN + '/auth/forgot');
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset code' })).toBeVisible();
  });
});

test.describe('Account + Track routing', () => {
  test('account page (signed out) prompts to sign in', async ({ page }) => {
    await page.goto(EN + '/account');
    await waitForApp(page);

    // Account.jsx renders an EmptyState requiring sign-in when no user.
    await expect(page.getByText('Sign in required')).toBeVisible();
    // The empty-state action link reads "Sign in →" (the bare "Sign in" in the
    // nav would make /Sign in/ ambiguous), scoped to <main>.
    await expect(
      page.locator('main').getByRole('link', { name: /Sign in →/ }),
    ).toBeVisible();
  });

  test('track page with a bogus token shows an error state, not a crash', async ({ page }) => {
    await page.goto(EN + '/track/not-a-real-token-000');
    await waitForApp(page);

    // Track.jsx ErrorState renders the generic error title with a retry action.
    // The app shell (nav/footer) must still be intact.
    await expect(page.getByRole('link', { name: 'BookBridge home' })).toBeVisible();
    await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 20_000 });
  });
});
