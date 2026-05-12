import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

export default function Home() {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const [stats, setStats] = useState({ books_delivered: 0, beneficiary_schools: 0, volunteer_schools: 0, donors: 0 });
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    apiGet('/api/stats').then(setStats).catch(() => {});
    apiGet('/api/schools?type=beneficiary').then((rows) => setSchools(rows.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-slogan">✨ {t('hero.slogan')}</p>
            <h1 className="hero-title">
              {t('hero.titleA')} <span className="highlight">{t('hero.titleB')}</span> {t('hero.titleC')}
            </h1>
            <p className="hero-desc">{t('hero.desc')}</p>
            <div className="hero-actions">
              <Link className="btn-primary" to={prefix + '/donate'}>📚 {t('hero.ctaDonate')}</Link>
              <Link className="btn-secondary" to={prefix + '/schools'}>🔍 {t('hero.ctaRequest')}</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">📚</div>
            <div className="hero-stats-row">
              <div className="stat-mini">
                <span className="stat-mini-val">{stats.books_delivered}+</span>
                <div className="stat-mini-lbl">{t('hero.statBooksDelivered')}</div>
              </div>
              <div className="stat-mini">
                <span className="stat-mini-val">{stats.beneficiary_schools}</span>
                <div className="stat-mini-lbl">{t('hero.statSchools')}</div>
              </div>
              <div className="stat-mini">
                <span className="stat-mini-val">{stats.donors}+</span>
                <div className="stat-mini-lbl">{t('hero.statDonors')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">{stats.books_delivered}+</div>
            <div className="stat-label">{t('hero.statBooksDelivered')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.beneficiary_schools}</div>
            <div className="stat-label">{t('hero.statSchools')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.volunteer_schools}</div>
            <div className="stat-label">{t('schools.volunteer')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">89%</div>
            <div className="stat-label">{t('stats.needLibrary')}</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'linear-gradient(135deg, rgba(255,251,240,0.96), rgba(255,247,230,0.96))' }}>
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag" style={{ background: 'rgba(237,198,152,0.2)', color: '#B07D20' }}>
              {t('problem.tag')}
            </div>
            <h2 className="section-title">{t('problem.title')}</h2>
            <p className="section-sub">{t('problem.sub')}</p>
          </div>
          <div className="mission-grid">
            <div className="mission-card"><span className="mc-icon">📉</span><h4>89%</h4><p>{t('problem.stat89')}</p></div>
            <div className="mission-card"><span className="mc-icon">🏔️</span><h4>1,800+</h4><p>{t('problem.stat1800')}</p></div>
            <div className="mission-card"><span className="mc-icon">📚</span><h4>{stats.books_delivered}+</h4><p>{t('hero.statBooksDelivered')}</p></div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag">{t('nav.schools')}</div>
            <h2 className="section-title">{t('schools.title')}</h2>
            <p className="section-sub">{t('schools.sub')}</p>
          </div>
          <div className="school-cards">
            {schools.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1' }}>
                <p style={{ color: 'var(--soft-gray)', textAlign: 'center' }}>
                  {t('schools.emptyHint')}
                </p>
              </div>
            )}
            {schools.map((s) => (
              <Link key={s.id} to={prefix + '/schools/' + s.id} className="school-card">
                <div className="school-card-header">
                  🏔️
                  <span className="school-badge">{t('schools.beneficiary')}</span>
                </div>
                <div className="school-card-body">
                  <h3>{s.name}</h3>
                  <div className="school-region">📍 {s.region} {s.city ? '· ' + s.city : ''}</div>
                </div>
                <div className="school-card-footer">
                  <div className="school-contact">{s.contact_phone || s.contact_email || ''}</div>
                  <span className="school-action-btn">{t('schools.donate')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag">{t('mission.tag')}</div>
            <h2 className="section-title">{t('mission.title')}</h2>
            <p className="section-sub">{t('mission.sub')}</p>
          </div>
          <div className="mission-grid">
            <div className="mission-card"><span className="mc-icon">🎯</span><h4>{t('mission.missionTitle')}</h4><p>{t('mission.missionBody')}</p></div>
            <div className="mission-card"><span className="mc-icon">👁️</span><h4>{t('mission.visionTitle')}</h4><p>{t('mission.visionBody')}</p></div>
            <div className="mission-card"><span className="mc-icon">💡</span><h4>{t('mission.transparencyTitle')}</h4><p>{t('mission.transparencyBody')}</p></div>
          </div>
        </div>
      </section>
    </>
  );
}
