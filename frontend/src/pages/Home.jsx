import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Leaderboard from '../components/Leaderboard.jsx';
import Activity from '../components/Activity.jsx';
import Icon from '../components/Icon.jsx';
import StampLabel from '../components/StampLabel.jsx';

// Hero photo — a warm field-notebook shot wrapped in a tape frame.
const HERO_PHOTO = 'https://picsum.photos/seed/bb-hero-trail/800/620';

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

// Render a row of book icons: filled = found, outlined = still needed.
function BookProgress({ pct }) {
  const total = 8;
  const filled = Math.max(0, Math.min(total, Math.round((pct / 100) * total)));
  return (
    <div className="progress-books-row" aria-label={pct + '%'}>
      {Array.from({ length: total }).map((_, i) => (
        <Icon
          key={i}
          name="book"
          size={14}
          color={i < filled ? 'var(--honey-400)' : 'var(--border-default)'}
          fill={i < filled ? 'var(--honey-400)' : 'none'}
          stroke={1.5}
        />
      ))}
    </div>
  );
}

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
      {/* HERO — Direction F editorial asymmetry: copy left, tape-frame photo right */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker reveal">
              <Icon name="books" size={17} color="var(--clay)" />
              {t('home.heroKicker')}
            </span>
            <h1 className="hero-title reveal">{t('home.heroTitle')}</h1>
            <p className="hero-poetic reveal">
              {t('hero.slogan')}
              <span className="ka">{t('footer.taglineKa')}</span>
            </p>
            <p className="hero-lede reveal">{t('home.heroSub')}</p>
            <div className="hero-cta reveal">
              {/* "Donate Books" — the primary honey CTA. Must stay. */}
              <Link to={prefix + '/donate'} className="btn btn-secondary btn-lg">{t('home.ctaPrimary')}</Link>
              <Link to={prefix + '/schools'} className="btn btn-ghost btn-lg">{t('home.ctaSecondary')}</Link>
            </div>
            <div className="hero-steps reveal" aria-label={t('home.howTitle')}>
              <span className="hs"><span className="n" aria-hidden="true">1</span>{t('home.heroStep1')}</span>
              <span className="arr" aria-hidden="true"><Icon name="arrowRight" size={16} color="var(--sage)" /></span>
              <span className="hs"><span className="n" aria-hidden="true">2</span>{t('home.heroStep2')}</span>
              <span className="arr" aria-hidden="true"><Icon name="arrowRight" size={16} color="var(--sage)" /></span>
              <span className="hs"><span className="n" aria-hidden="true">3</span>{t('home.heroStep3')}</span>
            </div>
          </div>

          <div className="hero-photo">
            <div className="photo-frame">
              <span className="tape t1" aria-hidden="true" />
              <span className="tape t2" aria-hidden="true" />
              <img
                src={HERO_PHOTO}
                alt={t('home.heroCaption').replace(/^—\s*/, '')}
                width={800}
                height={620}
                loading="eager"
                decoding="async"
              />
              <div className="ov" aria-hidden="true" />
              <p className="caption">{t('home.heroCaption')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ONE BIG NUMBER */}
      <section className="bignum">
        <div className="bignum-n">{(stats.books_delivered || 0).toLocaleString()}</div>
        <div className="bignum-l">{t('home.bignumLabel', { schools: stats.beneficiary_schools })}</div>
      </section>

      {/* HOW IT WORKS — dotted "route" line threading the 3 trail stops */}
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'left', marginLeft: 0 }}>
            <StampLabel>{t('home.howStamp')}</StampLabel>
            <h2 className="section-title reveal">{t('home.howTitle')}</h2>
          </div>
          <div className="trail">
            {/* the dotted hand-drawn route connecting the stops; hidden on mobile via CSS */}
            <div className="trail-route" aria-hidden="true">
              <svg viewBox="0 0 1000 120" preserveAspectRatio="none">
                <path
                  d="M40 40 C220 -10, 320 90, 500 50 S780 0, 960 56"
                  fill="none"
                  stroke="var(--clay)"
                  strokeWidth="2"
                  strokeDasharray="2 9"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <circle cx="40" cy="40" r="5" fill="var(--clay)" />
                <circle cx="500" cy="50" r="5" fill="var(--clay)" />
                <path d="M952 50 l12 6 -12 6" fill="none" stroke="var(--clay)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="steps trail-steps">
              <article className="step reveal" style={{ '--i': 0 }}>
                <div className="pin" aria-hidden="true">1</div>
                <h3>{t('home.step1Title')}</h3>
                <p>{t('home.step1Body')}</p>
                <div className="where">{t('home.step1Where')}</div>
              </article>
              <article className="step reveal" style={{ '--i': 1 }}>
                <div className="pin" aria-hidden="true">2</div>
                <h3>{t('home.step2Title')}</h3>
                <p>{t('home.step2Body')}</p>
                <div className="where">{t('home.step2Where')}</div>
              </article>
              <article className="step reveal" style={{ '--i': 2 }}>
                <div className="pin" aria-hidden="true">3</div>
                <h3>{t('home.step3Title')}</h3>
                <p>{t('home.step3Body')}</p>
                <div className="where">{t('home.step3Where')}</div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* SCHOOLS — kraft cards with region + fulfilment field-notebook tags */}
      <section className="section alt">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'left', marginLeft: 0 }}>
            <StampLabel>{t('home.schoolsStamp')}</StampLabel>
            <h2 className="section-title reveal">{t('home.schoolsTitle')}</h2>
          </div>
          <div className="school-grid">
            {schools.map((s) => (
              <Link key={s.id} to={prefix + '/schools/' + s.id} className="school">
                <div className="school-photo">
                  <img src={s.photo} alt={s.name} width={600} height={450} loading="lazy" decoding="async" />
                  {s.region && <span className="region-tag">{s.region.split(' · ')[0]}</span>}
                  <span className="books-tag">
                    <Icon name="book" size={14} color="var(--clay)" />
                    {t('home.fulfilledLabel')} · {s.need_pct}%
                  </span>
                </div>
                <div className="school-body">
                  <h3>{s.name}</h3>
                  <div className="school-region">{s.region}</div>
                  <div className="progress">
                    <div className="progress-books">
                      <BookProgress pct={s.need_pct} />
                    </div>
                    <div className="progress-books-label">
                      {t('home.fulfilledLabel')} · {s.need_pct}%
                    </div>
                  </div>
                </div>
                <div className="school-cta">
                  <span className="btn btn-secondary btn-block">{t('home.donateToSchool')}</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-7)' }}>
            <Link to={prefix + '/schools'} className="btn btn-ghost">{t('home.viewAllSchools')}</Link>
          </div>
        </div>
      </section>

      {/* ACTIVITY FEED */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home.activityTitle')}</h2>
            <p className="section-lede">{t('home.activitySub')}</p>
          </div>
          <Activity limit={6} />
        </div>
      </section>

      {/* TOP DONORS */}
      <section className="section alt">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home.topDonorsTitle')}</h2>
            <p className="section-lede">{t('home.topDonorsSub')}</p>
          </div>
          <Leaderboard />
        </div>
      </section>
    </>
  );
}
