import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiPost } from '../api.js';

export default function AccountSecurity() {
  const { t, lang } = useT();
  const { user, loading } = useAuth();
  const [factor, setFactor] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  if (loading) return <section className="section"><div className="card">Loading…</div></section>;
  if (!user) return (
    <section className="section"><div className="card">
      <h2>Sign in required</h2>
      <Link className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }} to={'/' + lang + '/auth'}>{t('auth.signin')}</Link>
    </div></section>
  );

  async function enroll() {
    setErr(null);
    try {
      const res = await apiPost('/api/auth/mfa/enroll', {});
      setFactor({ factor_id: res.factor_id, ...res.totp });
      const ch = await apiPost('/api/auth/mfa/challenge', { factor_id: res.factor_id });
      setChallenge(ch.challenge_id);
    } catch (e) { setErr(e.message); }
  }

  async function verify(e) {
    e.preventDefault();
    setErr(null);
    try {
      await apiPost('/api/auth/mfa/verify', { factor_id: factor.factor_id, challenge_id: challenge, code });
      setDone(true);
    } catch (e) { setErr(e.message); }
  }

  return (
    <section className="section">
      <div className="card" style={{ maxWidth: 600 }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, marginBottom: 16 }}>
          🔐 Security
        </h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>
          Add a TOTP authenticator (Google Authenticator, 1Password, Authy) to your BookBridge account.
        </p>

        {done && (
          <div style={{ background: 'rgba(45,139,122,0.1)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
            ✅ TOTP enabled. From your next sign-in you'll be asked for the 6-digit code.
          </div>
        )}

        {!factor && !done && (
          <button className="btn-primary" onClick={enroll}>Start TOTP setup</button>
        )}

        {factor && !done && (
          <>
            <p style={{ marginBottom: 12 }}>Scan this QR code with your authenticator app:</p>
            <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '2px solid var(--mist)', display: 'inline-block', marginBottom: 16 }}>
              <img src={factor.qr_code} alt="TOTP QR" style={{ width: 200, height: 200 }} />
            </div>
            <p style={{ color: 'var(--soft-gray)', fontSize: 13, marginBottom: 16 }}>
              Or type the secret manually: <code style={{ background: 'var(--mist)', padding: '2px 8px', borderRadius: 6 }}>{factor.secret}</code>
            </p>
            <form className="form" onSubmit={verify}>
              <label>6-digit code from your app</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required value={code} onChange={(e) => setCode(e.target.value)}
                style={{ letterSpacing: 4, fontSize: 18, textAlign: 'center' }}
              />
              {err && <div className="error">{err}</div>}
              <button className="btn-primary" type="submit">Verify & enable</button>
            </form>
          </>
        )}

        {err && !factor && <div className="error" style={{ marginTop: 16 }}>{err}</div>}
      </div>
    </section>
  );
}
