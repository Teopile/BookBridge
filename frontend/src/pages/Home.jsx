import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

const SAMPLE_PHOTOS = [
  'https://picsum.photos/seed/bb-school-1/600/350',
  'https://picsum.photos/seed/bb-school-2/600/350',
  'https://picsum.photos/seed/bb-school-3/600/350',
];

const SAMPLE_SCHOOLS = [
  { id: 'sample-1', name: 'School #1 · Adigeni',   region: 'Samtskhe-Javakheti', need_pct: 67, urgent: true,  photo: SAMPLE_PHOTOS[0] },
  { id: 'sample-2', name: 'School #4 · Khulo',     region: 'Adjara',              need_pct: 34, urgent: false, photo: SAMPLE_PHOTOS[1] },
  { id: 'sample-3', name: 'School #2 · Kareli',    region: 'Shida Kartli',        need_pct: 82, urgent: false, photo: SAMPLE_PHOTOS[2] },
];

export default function Home() {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const [stats, setStats] = useState({ books_delivered: 5100, beneficiary_schools: 51 });
  const [schools, setSchools] = useState(SAMPLE_SCHOOLS);

  useEffect(() => {
    apiGet('/api/stats').then((s) => {
      if ((s?.beneficiary_schools || 0) > 0) setStats(s);
    }).catch(() => {});
    apiGet('/api/schools?type=beneficiary').then((rows) => {
      if (rows && rows.length > 0) {
        setSchools(rows.slice(0, 3).map((s, i) => ({
          id: s.id,
          name: s.name,
          region: [s.region, s.city].filter(Boolean).join(' · '),
          need_pct: 50,
          urgent: i === 0,
          photo: s.photo_url || SAMPLE_PHOTOS[i % 3],
        })));
      }
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <h1>{t('home.heroTitle')}</h1>
          <p>{t('home.heroSub')}</p>
          <div className="hero-actions">
            <Link to={prefix + '/donate'} className="btn btn-primary btn-lg">{t('home.ctaPrimary')}</Link>
            <Link to={prefix + '/schools'} className="btn btn-secondary btn-lg">{t('home.ctaSecondary')}</Link>
          </div>
        </div>
      </section>

      {/* ONE BIG NUMBER */}
      <section className="bignum">
        <div className="bignum-n">{(stats.books_delivered || 0).toLocaleString()}</div>
        <div className="bignum-l">{t('home.bignumLabel', { schools: stats.beneficiary_schools })}</div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home.howTitle')}</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>{t('home.step1Title')}</h3>
              <p>{t('home.step1Body')}</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>{t('home.step2Title')}</h3>
              <p>{t('home.step2Body')}</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>{t('home.step3Title')}</h3>
              <p>{t('home.step3Body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHOOLS */}
      <section className="section alt">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home.schoolsTitle')}</h2>
          </div>
          <div className="school-grid">
            {schools.map((s) => (
              <Link key={s.id} to={prefix + '/schools/' + s.id} className="school">
                <div className="school-photo">
                  <img src={s.photo} alt={s.name} loading="lazy" />
                  {s.urgent && <span className="school-badge urgent">{t('home.urgentBadge')}</span>}
                </div>
                <div className="school-body">
                  <h3>{s.name}</h3>
                  <div className="school-region">{s.region}</div>
                  <div className="progress">
                    <div className="progress-meta">
                      <span>{t('home.fulfilledLabel')}</span>
                      <strong>{s.need_pct}%</strong>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: s.need_pct + '%' }} />
                    </div>
                  </div>
                </div>
                <div className="school-cta">
                  <span className="btn btn-primary btn-block">{t('home.donateToSchool')}</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to={prefix + '/schools'} className="btn btn-ghost">{t('home.viewAllSchools')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
