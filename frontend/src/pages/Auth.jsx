import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Auth() {
  const { t, lang } = useT();
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'donor' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === 'signin') {
        await login(form.email, form.password);
        navigate('/' + lang + '/account');
      } else {
        await register({ ...form, language: lang });
        await login(form.email, form.password);
        navigate('/' + lang + '/account');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, marginBottom: 8 }}>
          {mode === 'signin' ? t('auth.signin') : t('auth.signup')}
        </h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            {mode === 'signin' ? t('auth.signup') : t('auth.signin')}
          </button>
        </p>

        <form className="form" onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <label>{t('auth.name')}</label>
              <input type="text" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />

              <label>{t('auth.role')}</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="donor">{t('auth.roleDonor')}</option>
                <option value="beneficiary">{t('auth.roleBeneficiary')}</option>
                <option value="volunteer">{t('auth.roleVolunteer')}</option>
              </select>
            </>
          )}

          <label>{t('auth.email')}</label>
          <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />

          <label>{t('auth.password')}</label>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} />

          {err && <div className="error">{err}</div>}

          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? '…' : t('auth.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
