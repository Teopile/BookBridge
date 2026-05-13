import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

const HERO_PHOTO = 'https://picsum.photos/seed/bb-about/1200/450';

export default function About() {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{
          aspectRatio: '3 / 1',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 32,
          background: 'var(--gray-100)',
          position: 'relative',
        }}>
          <img src={HERO_PHOTO} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 style={{ marginBottom: 16 }}>{t('about.title')}</h1>
        <p style={{ color: 'var(--gray-700)', fontSize: 17, lineHeight: 1.7, marginBottom: 24 }}>
          {t('about.p1')}
        </p>
        <p style={{ color: 'var(--gray-700)', fontSize: 17, lineHeight: 1.7, marginBottom: 24 }}>
          {t('about.p2')}
        </p>
        <p style={{ color: 'var(--gray-700)', fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
          {t('about.p3')}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to={prefix + '/donate'} className="btn btn-primary btn-lg">
            {t('home.ctaPrimary')}
          </Link>
          <Link to={prefix + '/schools'} className="btn btn-secondary btn-lg">
            {t('home.ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
