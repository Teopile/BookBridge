import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiPost } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Auth() {
  const { t, lang } = useT();
  const { login, register, refresh } = useAuth();
  const navigate = useNavigate();

  // 'signin' | 'signup' | 'verify-otp'
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', username: '', password: '', otp: '' });
  const [pendingEmail, setPendingEmail] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submitSignin(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/' + lang + '/account');
    } catch (e) {
      if (e.message === 'email_not_confirmed') {
        setPendingEmail(form.email);
        try { await apiPost('/api/auth/resend-otp', { email: form.email }); } catch {}
        setMode('verify-otp');
        setErr(null);
      } else {
        setErr(e.message);
      }
    } finally { setBusy(false); }
  }

  async function submitSignup(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await register({ email: form.email, username: form.username, password: form.password, language: lang });
      setPendingEmail(form.email);
      setMode('verify-otp');
    } catch (e) {
      setErr(translateSignupError(e.message, t));
    } finally { setBusy(false); }
  }

  async function submitVerifyOtp(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await apiPost('/api/auth/verify-otp', { email: pendingEmail, token: form.otp });
      await refresh();
      navigate('/' + lang + '/account');
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  async function resendOtp() {
    setErr(null);
    try {
      await apiPost('/api/auth/resend-otp', { email: pendingEmail });
    } catch (e) {
      setErr(e.message);
    }
  }

  if (mode === 'verify-otp') {
    return (
      <section className="section">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
            <Icon name="mailEnvelope" size={56} color="var(--forest-600)" />
          </div>
          <h1 style={{ fontSize: 'var(--fs-h2)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
            {t('auth.verifyTitle')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            {t('auth.verifySub')} <strong>{pendingEmail}</strong>
          </p>

          <form className="form" onSubmit={submitVerifyOtp}>
            <label htmlFor="auth-otp">{t('auth.otpCode')}</label>
            <input
              id="auth-otp"
              type="text" inputMode="numeric" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required
              value={form.otp} onChange={(e) => set('otp', e.target.value.replace(/\D/g, ''))}
              style={{
                letterSpacing: 6,
                fontSize: 28,
                textAlign: 'center',
                fontFamily: 'monospace',
                minHeight: 64,
                borderRadius: 'var(--r-md)',
              }}
              autoFocus
            />
            {err && <div className="error">{err}</div>}
            <button className="btn btn-primary" disabled={busy || form.otp.length < 6} type="submit">
              {busy ? '…' : t('auth.verifyButton')}
            </button>
            <button
              type="button"
              onClick={resendOtp}
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'center' }}
            >
              {t('auth.resendCode')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('signin'); setPendingEmail(null); setErr(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subtle)',
                fontSize: 'var(--fs-sm)',
                cursor: 'pointer',
                padding: 'var(--space-2) 0',
              }}
            >
              ← {t('auth.backToSignin')}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontSize: 'var(--fs-h2)', marginBottom: 'var(--space-2)' }}>
          {mode === 'signin' ? t('auth.signin') : t('auth.signup')}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--forest-600)',
              fontWeight: 'var(--fw-bold)',
              cursor: 'pointer',
              padding: '4px 2px',
              textDecoration: 'underline',
            }}
          >
            {mode === 'signin' ? t('auth.signup') : t('auth.signin')}
          </button>
        </p>

        {mode === 'signin' ? (
          <form className="form" onSubmit={submitSignin}>
            <label htmlFor="signin-email">{t('auth.email')}</label>
            <input id="signin-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

            <label htmlFor="signin-password">{t('auth.password')}</label>
            <input id="signin-password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => set('password', e.target.value)} />

            {err && <div className="error">{err}</div>}

            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? '…' : t('auth.signin')}
            </button>

            <Link
              to={'/' + lang + '/auth/forgot'}
              style={{
                color: 'var(--text-subtle)',
                fontSize: 'var(--fs-sm)',
                textAlign: 'center',
                padding: 'var(--space-2) 0',
              }}
            >
              {t('auth.forgotPassword')}
            </Link>
          </form>
        ) : (
          <form className="form" onSubmit={submitSignup}>
            <label htmlFor="signup-email">{t('auth.email')}</label>
            <input id="signup-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

            <label htmlFor="signup-username">{t('auth.username')}</label>
            <input
              id="signup-username"
              type="text" autoComplete="username" required minLength={3} maxLength={30}
              pattern="[A-Za-z0-9_\-]{3,30}"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder={t('auth.usernameHint')}
            />

            <label htmlFor="signup-password">{t('auth.password')}</label>
            <input id="signup-password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} />

            {err && <div className="error">{err}</div>}

            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? '…' : t('auth.createAccount')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function translateSignupError(msg, t) {
  if (msg === 'username_taken') return t('auth.errUsernameTaken');
  if (msg === 'email_taken') return t('auth.errEmailTaken');
  return msg;
}
