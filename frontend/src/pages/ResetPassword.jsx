import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiPost } from '../api.js';

function readHashTokens() {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
  };
}

export default function ResetPassword() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { setTokens(readHashTokens()); }, []);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    if (!tokens?.access_token) { setErr('Missing recovery token. Please click the link from your email again.'); return; }
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/auth/reset-password', {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
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
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32 }}>✅ Password updated</h1>
          <p style={{ color: 'var(--soft-gray)', marginTop: 16 }}>Redirecting you to sign in…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, marginBottom: 24 }}>Reset password</h1>
        <form className="form" onSubmit={submit}>
          <label>New password</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <label>Confirm new password</label>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {err && <div className="error">{err}</div>}
          <button className="btn-primary" disabled={busy}>{busy ? '…' : 'Update password'}</button>
          <Link to={'/' + lang + '/auth'} style={{ color: 'var(--soft-gray)', textAlign: 'center', fontSize: 13 }}>← {t('auth.signin')}</Link>
        </form>
      </div>
    </section>
  );
}
