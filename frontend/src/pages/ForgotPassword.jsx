import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiPost } from '../api.js';

export default function ForgotPassword() {
  const { t, lang } = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (sent) {
    return (
      <section className="section">
        <div className="card">
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32 }}>📧 Check your inbox</h1>
          <p style={{ color: 'var(--soft-gray)', marginTop: 16 }}>
            If an account exists for <strong>{email}</strong>, we just sent a reset link.
          </p>
          <Link to={'/' + lang + '/auth'} className="btn-secondary" style={{ marginTop: 24, display: 'inline-block' }}>← {t('auth.signin')}</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, marginBottom: 8 }}>Forgot password</h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>
          Enter your email and we'll send you a link to reset it.
        </p>
        <form className="form" onSubmit={submit}>
          <label>{t('auth.email')}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {err && <div className="error">{err}</div>}
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? '…' : 'Send reset link'}
          </button>
          <Link to={'/' + lang + '/auth'} style={{ color: 'var(--soft-gray)', textAlign: 'center', fontSize: 13 }}>← {t('auth.signin')}</Link>
        </form>
      </div>
    </section>
  );
}
