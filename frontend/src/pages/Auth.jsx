import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiPost } from '../api.js';
import Icon from '../components/Icon.jsx';

const LAST_EMAIL_KEY = 'bb_last_email';

// Unicode-aware username: any letter (Georgian included) or digit, _ and -.
const USERNAME_RE = /^[\p{L}\p{N}_-]{3,30}$/u;

function rememberEmail(email) {
  try { localStorage.setItem(LAST_EMAIL_KEY, email); } catch {}
}
function lastEmail() {
  try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch { return ''; }
}

export default function Auth() {
  const { t, lang } = useT();
  const { login, register, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // 'signin' | 'signup' | 'verify-otp'  (?mode=signup deep-links the signup form)
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [form, setForm] = useState({ email: lastEmail(), username: '', password: '', otp: '' });
  const [remember, setRemember] = useState(true);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [err, setErr] = useState(null);
  const [fieldErrs, setFieldErrs] = useState({});
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrs((fe) => (fe[k] ? { ...fe, [k]: null } : fe));
  }

  // Where to land after a successful sign-in: the ?next= path the user came
  // from (e.g. the donation flow), or the account page. Only same-site paths.
  function afterAuthPath() {
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      // Legacy callers pass a lang-less path like "/donate".
      return /^\/(en|ka)(\/|$)/.test(next) ? next : '/' + lang + next;
    }
    return '/' + lang + '/account';
  }

  // Live, specific validation — every rule the user can break is named in the
  // message; never a bare red border.
  function validateSignup() {
    const fe = {};
    const u = form.username.trim();
    if (u.length < 3 || u.length > 30) fe.username = t('auth.errUsernameLength');
    else if (!USERNAME_RE.test(u)) fe.username = t('auth.errUsernameChars');
    if (form.password.length < 8) fe.password = t('auth.errPasswordShort');
    setFieldErrs(fe);
    return Object.keys(fe).length === 0;
  }

  async function submitSignin(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await login(form.email, form.password, remember);
      rememberEmail(form.email);
      navigate(afterAuthPath());
    } catch (e) {
      if (e.message === 'email_not_confirmed') {
        setPendingEmail(form.email);
        try { await apiPost('/api/auth/resend-otp', { email: form.email }); } catch {}
        setMode('verify-otp');
        setErr(null);
      } else if (e.status === 401) {
        setErr(t('auth.errBadCredentials'));
      } else {
        setErr(e.message);
      }
    } finally { setBusy(false); }
  }

  async function submitSignup(e) {
    e.preventDefault();
    setErr(null);
    if (!validateSignup()) return;
    setBusy(true);
    try {
      await register({ email: form.email, username: form.username.trim(), password: form.password, language: lang });
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
      rememberEmail(pendingEmail);
      await refresh();
      navigate(afterAuthPath());
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
              id="auth-otp" name="otp"
              type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6,10}" minLength={6} maxLength={10} required
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
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null); setFieldErrs({}); }}
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
            <input id="signin-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

            <label htmlFor="signin-password">{t('auth.password')}</label>
            <input id="signin-password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => set('password', e.target.value)} />

            <label className="checkbox-row" htmlFor="signin-remember">
              <input
                id="signin-remember" type="checkbox"
                checked={remember} onChange={(e) => setRemember(e.target.checked)}
              />
              {t('auth.rememberMe')}
            </label>

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
            <input id="signup-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

            <label htmlFor="signup-username">{t('auth.username')}</label>
            <input
              id="signup-username" name="username"
              type="text" autoComplete="username" required minLength={3} maxLength={30}
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              aria-describedby="signup-username-rules"
              aria-invalid={fieldErrs.username ? 'true' : undefined}
            />
            {fieldErrs.username
              ? <p className="field-error" role="alert">{fieldErrs.username}</p>
              : <p className="field-hint" id="signup-username-rules">{t('auth.usernameRules')}</p>}

            <label htmlFor="signup-password">{t('auth.password')}</label>
            <input
              id="signup-password" name="password"
              type="password" autoComplete="new-password" required minLength={8}
              value={form.password} onChange={(e) => set('password', e.target.value)}
              aria-describedby="signup-password-rules"
              aria-invalid={fieldErrs.password ? 'true' : undefined}
            />
            {fieldErrs.password
              ? <p className="field-error" role="alert">{fieldErrs.password}</p>
              : <p className="field-hint" id="signup-password-rules">{t('auth.passwordRules')}</p>}

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
