// Drive `document.title` from the current pathname + active language.
// Mounted once at the App root — no need to touch every page.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

// Map path (without /en|/ka prefix) -> i18n key for the page title.
// Try exact match, then first segment, then home.
const TITLE_KEYS = {
  '':                    'home.heroTitle',
  'schools':             'schools.title',
  'how-it-works':        'nav.how',
  'donate':              'home.ctaPrimary',
  'about':               'nav.about',
  'privacy':             'legal.privacyTitle',
  'terms':               'legal.termsTitle',
  'cookies':             'legal.cookiesTitle',
  'search':              'nav.search',
  'auth':                'nav.login',
  'auth/forgot':         'auth.forgotTitle',
  'auth/reset-password': 'auth.resetTitle',
  'account':             'nav.account',
  'school/manage':       'schoolManage.title',
  'volunteer/manage':    'volunteerManage.title',
  'dashboard':           'nav.home',
  'track':               'track.title',
};

const BRAND = 'BookBridge';

export function useDocumentTitle() {
  const { t } = useT();
  const { pathname } = useLocation();

  useEffect(() => {
    const stripped = pathname.replace(/^\/(en|ka)\/?/, '');
    const candidate =
      TITLE_KEYS[stripped] ??
      TITLE_KEYS[stripped.split('/')[0]] ??
      TITLE_KEYS[''];

    const page = t(candidate);
    // t() returns the key itself when missing — fall back to brand-only in that case.
    document.title = page && page !== candidate ? `${page} · ${BRAND}` : BRAND;
  }, [pathname, t]);
}
