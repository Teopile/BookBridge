import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import Icon from '../components/Icon.jsx';
import SectionHero from '../components/SectionHero.jsx';
import TEAM from '../content/team.js';
import TESTIMONIALS from '../content/testimonials.js';

const VALUE_ICONS = ['heart', 'user', 'pin', 'bookOpen'];

export default function About() {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  return (
    <>
      <SectionHero
        image="/heroes/about.jpg"
        title={t('about.title')}
        subtitle={t('hero.slogan')}
      />

      {/* Intro — what BookBridge does */}
      <section className="section">
        <div className="container container-narrow">
          {[['sparkle', 'p1'], ['bookOpen', 'p2'], ['heart', 'p3']].map(([icon, key]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
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
                <Icon name={icon} size={22} fill={icon === 'heart' ? 'currentColor' : 'none'} stroke={icon === 'heart' ? 0 : undefined} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 'var(--lh-relaxed)', margin: 0 }}>
                {t('about.' + key)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* „როგორ დაიწყო" — How it began (photo left, story right) */}
      <section className="section alt">
        <div className="container">
          <div className="about-began">
            <div className="about-began-photo">
              <img src="/heroes/story-2.jpg" alt="" width={800} height={640} loading="lazy" decoding="async" />
            </div>
            <div className="about-began-copy">
              <h2>{t('aboutBegin.title')}</h2>
              <p>{t('aboutBegin.p1')}</p>
              <p>{t('aboutBegin.p2')}</p>
              <p>{t('aboutBegin.p3')}</p>
              <Link to={prefix + '/donate'} className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>
                {t('aboutBegin.cta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* „ჩვენი ღირებულებები" — Our values (4 icon cards, 2×2 desktop) */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="values-eyebrow">{t('aboutValues.eyebrow')}</p>
            <h2 className="section-title">{t('aboutValues.title')}</h2>
          </div>
          <div className="values-grid">
            {[1, 2, 3, 4].map((n, i) => (
              <div className="value-card" key={n}>
                <div className="value-icon">
                  <Icon name={VALUE_ICONS[i]} size={22} />
                </div>
                <h3>{t(`aboutValues.v${n}t`)}</h3>
                <p>{t(`aboutValues.v${n}b`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* „ჩვენ ვართ" — team. Data-driven; hidden until content/team.js has records. */}
      {TEAM.length > 0 && (
        <section className="section alt">
          <div className="container">
            <div className="section-header">
              <p className="values-eyebrow">{t('aboutTeam.eyebrow')}</p>
              <h2 className="section-title">{t('aboutTeam.title')}</h2>
            </div>
            <div className="team-grid">
              {TEAM.map((m) => (
                <div className="team-card" key={m.id}>
                  <div className="team-photo">
                    <img src={m.photo} alt={m.name[lang] || m.name.ka} width={180} height={180} loading="lazy" decoding="async" />
                  </div>
                  <h3>{m.name[lang] || m.name.ka}</h3>
                  <div className="team-role">{m.role[lang] || m.role.ka}</div>
                  <p>{m.bio[lang] || m.bio.ka}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* „რას ამბობს ჩვენი საზოგადოება" — community voices. No star ratings
          (donation platform, not a store). Hidden until content exists. */}
      {TESTIMONIALS.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">{t('aboutVoices.title')}</h2>
            </div>
            <div className="testimonial-grid">
              {TESTIMONIALS.map((q) => (
                <figure className="testimonial-card" key={q.id}>
                  <blockquote>{q.quote[lang] || q.quote.ka}</blockquote>
                  <figcaption>
                    <strong>{q.name[lang] || q.name.ka}</strong>
                    {q.date && <span className="testimonial-date">{new Date(q.date).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB')}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section">
        <div className="container container-narrow">
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to={prefix + '/donate'} className="btn btn-secondary btn-lg">
              {t('home.ctaPrimary')}
            </Link>
            <Link to={prefix + '/schools'} className="btn btn-ghost btn-lg">
              {t('home.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
