import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiPost } from '../api.js';

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
      // If the email isn't confirmed yet, jump to the OTP step.
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

  // ----- verify-otp screen -----
  if (mode === 'verify-otp') {
    return (
      <section className="section">
        <div className="card">
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>
            {t('auth.verifyTitle')}
          </h1>
          <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>
            {t('auth.verifySub')} <strong>{pendingEmail}</strong>
          </p>

          <form className="form" onSubmit={submitVerifyOtp}>
            <label>{t('auth.otpCode')}</label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required
              value={form.otp} onChange={(e) => set('otp', e.target.value.replace(/\D/g, ''))}
              style={{ letterSpacing: 6, fontSize: 22, textAlign: 'center', fontFamily: 'monospace' }}
              autoFocus
            />
            {err && <div className="error">{err}</div>}
            <button className="btn-primary" disabled={busy || form.otp.length < 6} type="submit">
              {busy ? '…' : t('auth.verifyButton')}
            </button>
            <button
              type="button"
              onClick={resendOtp}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('auth.resendCode')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('signin'); setPendingEmail(null); setErr(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--soft-gray)', fontSize: 13, cursor: 'pointer' }}
            >
              ← {t('auth.backToSignin')}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // ----- signin / signup screen -----
  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          {mode === 'signin' ? t('auth.signin') : t('auth.signup')}
        </h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            {mode === 'signin' ? t('auth.signup') : t('auth.signin')}
          </button>
        </p>

        {mode === 'signin' ? (
          <form className="form" onSubmit={submitSignin}>
            <label>{t('auth.email')}</label>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

            <label>{t('auth.password')}</label>
            <input type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} />

            {err && <div className="error">{err}</div>}

            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? '…' : t('auth.signin')}
            </button>

            <Link to={'/' + lang + '/auth/forgot'} style={{ color: 'var(--soft-gray)', fontSize: 13, textAlign: 'center' }}>
              {t('auth.forgotPassword')}
            </Link>
          </form>
        ) : (
          <form className="form" onSubmit={submitSignup}>
            <label>{t('auth.email')}</label>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

            <label>{t('auth.username')}</label>
            <input
              type="text" required minLength={3} maxLength={30}
              pattern="[A-Za-z0-9_\-]{3,30}"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder={t('auth.usernameHint')}
            />

            <label>{t('auth.password')}</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} />

            {err && <div className="error">{err}</div>}

            <button className="btn-primary" disabled={busy} type="submit">
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
