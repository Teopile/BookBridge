import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

export default function NotFound() {
  const { t, lang } = useT();
  return (
    <section className="section">
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🏔️</div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, marginBottom: 12 }}>404</h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>This page got lost in the mountains.</p>
        <Link className="btn-primary" to={'/' + lang}>← {t('nav.home')}</Link>
      </div>
    </section>
  );
}
