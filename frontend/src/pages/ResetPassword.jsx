import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiPost } from '../api.js';

export default function ResetPassword() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get('email') || '');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) { setErr(t('auth.errPasswordMismatch')); return; }
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/auth/reset-password', {
        email,
        token,
        new_password: password,
      });
      setDone(true);
      setTimeout(() => navigate('/' + lang + '/auth'), 1500);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (done) {
    return (
      <section className="section">
        <div className="card">
          <h1 style={{ fontSize: 32 }}>✅ {t('auth.passwordUpdated')}</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 16 }}>{t('auth.redirectingToSignin')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          {t('auth.resetTitle')}
        </h1>
        <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
          {t('auth.resetSub')}
        </p>
        <form className="form" onSubmit={submit}>
          <label htmlFor="reset-email">{t('auth.email')}</label>
          <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="reset-otp">{t('auth.otpCode')}</label>
          <input
            id="reset-otp"
            type="text" inputMode="numeric" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required
            value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            style={{ letterSpacing: 6, fontSize: 22, textAlign: 'center', fontFamily: 'monospace' }}
          />

          <label htmlFor="reset-new">{t('auth.newPassword')}</label>
          <input id="reset-new" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />

          <label htmlFor="reset-confirm">{t('auth.confirmPassword')}</label>
          <input id="reset-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />

          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary" disabled={busy || token.length < 6} type="submit">
            {busy ? '…' : t('auth.updatePassword')}
          </button>
          <Link to={'/' + lang + '/auth'} style={{ color: 'var(--gray-500)', textAlign: 'center', fontSize: 13, padding: '8px 0' }}>
            ← {t('auth.backToSignin')}
          </Link>
        </form>
      </div>
    </section>
  );
}
