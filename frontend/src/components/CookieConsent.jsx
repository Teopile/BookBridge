import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

// Lightweight cookie notice. BookBridge uses only strictly-necessary cookies
// (session + CSRF) and one language preference — no tracking or ads — so this
// is an acknowledgement, not a granular consent manager. The acknowledgement is
// remembered in localStorage so it isn't shown on every visit.
const KEY = 'bb_cookie_consent';

export default function CookieConsent() {
  const { t, lang } = useT();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return true; }
  });

  if (dismissed) return null;

  function accept() {
    try { localStorage.setItem(KEY, '1'); } catch { /* private mode — just hide */ }
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-label={t('cookieBanner.title')}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 300,
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'var(--surface-elev, #fff)',
        borderTop: '1px solid var(--border-default, #e2e8e6)',
        boxShadow: '0 -6px 24px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-muted, #4a5a55)', flex: '1 1 320px' }}>
          {t('cookieBanner.text')}{' '}
          <Link to={'/' + lang + '/cookies'} style={{ color: 'var(--teal, #2D8B7A)', whiteSpace: 'nowrap' }}>
            {t('cookieBanner.learnMore')}
          </Link>
        </p>
        <button className="btn btn-primary btn-sm" onClick={accept}>{t('cookieBanner.accept')}</button>
      </div>
    </div>
  );
}
