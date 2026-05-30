# BookBridge frontend E2E (Playwright)

End-to-end specs for the critical public flows, run against the **live** site
(https://bookbridge.ge) by default.

## What's covered

| Spec | Flow |
|------|------|
| `home.spec.js`       | `/` → `/en` redirect, hero title/sub, CTAs link to donate/schools, big stat number + section headings, school cards |
| `language.spec.js`   | EN↔KA toggle (URL + `<html lang>` + re-rendered copy), language persists across nav |
| `navigation.spec.js` | Top-nav links, logo→home, 404 page, schools list loads real data, school detail page, region filter populated |
| `search.spec.js`     | Default browse list, query returns hits, nonsense query → empty state, filter pills toggle |
| `donate.spec.js`     | Wizard opens on step 1, school picker populated, "Next" gating, advance to step 2, `?school=` deep link |
| `auth.spec.js`       | Sign-in form, toggle to sign-up, empty-submit validation, forgot-password page, account (signed-out) prompt, track error state |
| `footer.spec.js`     | Footer columns/copyright/links, marketing CTA shown on home & hidden on `/auth` |

Write flows (donate submit, account creation, OTP) are intentionally **not**
exercised past the form/validation level — no real donations or accounts created.

## Running

The runner + chromium come from the prebuilt install at `C:\Users\User\bb-pw`
(the `playwright` package re-exports the test runner under `playwright/test`).

From this folder (`tests/e2e`):

```powershell
# headless
node C:/Users/User/bb-pw/node_modules/playwright/cli.js test

# headed (watch it run)
node C:/Users/User/bb-pw/node_modules/playwright/cli.js test --headed

# one file
node C:/Users/User/bb-pw/node_modules/playwright/cli.js test home.spec.js

# against a local dev server instead of the live site
$env:BASE_URL = "http://localhost:5173"
node C:/Users/User/bb-pw/node_modules/playwright/cli.js test
```

If you put `bb-pw/node_modules/.bin` on PATH (or run from a project that has
`@playwright/test`), `npx playwright test` works too.

## Notes / resilience choices

- Selectors prefer `getByRole`/`getByText` with real copy from `frontend/src/i18n/en.js`.
- Live school names are Georgian, so list/detail tests assert structure
  (`a.school` cards, the school's own `<h3>`/`<h1>`) rather than hardcoded names.
- The home "big number" may briefly show the 5,100 fallback before `/api/stats`
  resolves (live value is 0), so that test asserts digits + the "schools" label,
  not an exact count.
