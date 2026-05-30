// Shared helpers for BookBridge E2E specs.
import { expect } from 'playwright/test';

// The app redirects "/" -> "/en" and prefixes every route with a language seg.
// Most tests start from a localized path directly to skip the redirect hop.
export const EN = '/en';
export const KA = '/ka';

// Real, stable English copy harvested from frontend/src/i18n/en.js.
// Asserting on these proves the SPA actually rendered (not just a blank shell).
export const COPY = {
  heroTitle: 'Donate books to mountain schools.',
  heroSub: 'Pick a school. Choose books. We deliver.',
  ctaPrimary: 'Donate a book',
  ctaSecondary: 'See schools',
  howTitle: 'How it works',
  schoolsTitle: 'Schools waiting now',
  topDonorsTitle: 'Top donors',
  schoolsPageTitle: 'Schools',
  donateStep1: 'Choose a school',
  donateStep2: 'Pick books',
  authSignin: 'Sign in',
  authCreateAccount: 'Create account',
  authVerifyTitle: 'Check your inbox',
  notFoundBody: 'This page got lost in the mountains.',
  footerRights: '© 2026 BookBridge · Georgia',
};

// Some Georgian copy (the live site has Georgian school data + a KA locale).
export const COPY_KA = {
  // ka.js hero title — used to prove the language toggle actually re-rendered.
  // Kept loose: we only assert the document <html lang> + that EN copy is gone.
};

// Wait until the SPA has rendered real content into <main>, not the skeleton.
export async function waitForApp(page) {
  await expect(page.locator('main')).toBeVisible();
  // The nav is part of the app shell and renders immediately after hydration.
  await expect(page.getByRole('link', { name: 'BookBridge home' })).toBeVisible();
}

// Resilient "first school card" locator shared by schools/search specs.
// School cards are <a class="school"> with an <h3> name inside.
export function firstSchoolCard(page) {
  return page.locator('a.school').first();
}
