import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

export default function AuthConfirm() {
  const { t, lang } = useT();
  return (
    <section className="section">
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, marginTop: 16 }}>
          Email confirmed!
        </h1>
        <p style={{ color: 'var(--soft-gray)', marginTop: 12, marginBottom: 32 }}>
          Your BookBridge account is ready. You can now sign in.
        </p>
        <Link to={'/' + lang + '/auth'} className="btn-primary">{t('auth.signin')} →</Link>
      </div>
    </section>
  );
}
