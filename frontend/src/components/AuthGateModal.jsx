import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import Icon from './Icon.jsx';

// Auth gate shown when a logged-out user opens the donation flow (MyHome.ge
// pattern): prompt sign-in BEFORE the user invests effort in the form. The
// current location (path + query, e.g. ?school=…) is carried via ?next= so a
// successful sign-in or sign-up drops the user straight back into the flow.
export default function AuthGateModal() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef(null);

  const returnTo = location.pathname + location.search;
  const next = '?next=' + encodeURIComponent(returnTo);

  // Closing the gate returns the user to where they came from.
  function close() { navigate(-1); }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('a.btn-primary')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const benefits = [t('authGate.b1'), t('authGate.b2'), t('authGate.b3')];

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        ref={dialogRef}
      >
        <button className="modal-close" onClick={close} aria-label={t('authGate.close')}>×</button>

        <div className="modal-illustration" aria-hidden="true">
          <Icon name="gift" size={44} color="var(--forest-600)" />
        </div>

        <h2 id="auth-gate-title" className="modal-title">{t('authGate.title')}</h2>

        <ul className="modal-benefits">
          {benefits.map((b) => (
            <li key={b}>
              <Icon name="check" size={18} color="var(--forest-600)" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <a className="btn btn-primary modal-cta" href={'/' + lang + '/auth' + next}
           onClick={(e) => { e.preventDefault(); navigate('/' + lang + '/auth' + next); }}>
          {t('authGate.signin')}
        </a>

        <p className="modal-alt">
          {t('authGate.noAccount')}{' '}
          <a href={'/' + lang + '/auth?mode=signup&next=' + encodeURIComponent(returnTo)}
             onClick={(e) => { e.preventDefault(); navigate('/' + lang + '/auth?mode=signup&next=' + encodeURIComponent(returnTo)); }}>
            {t('authGate.create')}
          </a>
        </p>
      </div>
    </div>
  );
}
