import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import Icon from '../components/Icon.jsx';

const HERO_PHOTO = 'https://picsum.photos/seed/bb-about/900/300';

export default function About() {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  return (
    <section className="section">
      <div className="container container-narrow">
        <div className="page-banner">
          <img src={HERO_PHOTO} alt="" width={900} height={300} loading="lazy" decoding="async" />
        </div>

        <h1 style={{ marginBottom: 'var(--space-4)' }}>{t('about.title')}</h1>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div style={{
            flexShrink: 0,
            width: 40, height: 40,
            background: 'var(--honey-50)',
            color: 'var(--forest-600)',
            borderRadius: 'var(--r-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="sparkle" size={22} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-relaxed)', margin: 0 }}>
            {t('about.p1')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div style={{
            flexShrink: 0,
            width: 40, height: 40,
            background: 'var(--honey-50)',
            color: 'var(--forest-600)',
            borderRadius: 'var(--r-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="bookOpen" size={22} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-relaxed)', margin: 0 }}>
            {t('about.p2')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          <div style={{
            flexShrink: 0,
            width: 40, height: 40,
            background: 'var(--honey-50)',
            color: 'var(--forest-600)',
            borderRadius: 'var(--r-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="heart" size={22} fill="currentColor" stroke={0} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-relaxed)', margin: 0 }}>
            {t('about.p3')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to={prefix + '/donate'} className="btn btn-secondary btn-lg">
            {t('home.ctaPrimary')}
          </Link>
          <Link to={prefix + '/schools'} className="btn btn-ghost btn-lg">
            {t('home.ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
