import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiPost } from '../api.js';

export default function ForgotPassword() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/auth/forgot-password', { email });
      // Always advance — server returns 200 whether the email exists or not, to avoid enumeration.
      navigate('/' + lang + '/auth/reset-password?email=' + encodeURIComponent(email));
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          {t('auth.forgotTitle')}
        </h1>
        <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
          {t('auth.forgotSub')}
        </p>
        <form className="form" onSubmit={submit}>
          <label htmlFor="forgot-email">{t('auth.email')}</label>
          <input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? '…' : t('auth.sendResetCode')}
          </button>
          <Link to={'/' + lang + '/auth'} style={{ color: 'var(--gray-500)', textAlign: 'center', fontSize: 13, padding: '8px 0' }}>
            ← {t('auth.backToSignin')}
          </Link>
        </form>
      </div>
    </section>
  );
}
