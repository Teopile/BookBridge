import { useEffect, useState } from 'react';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Dashboard() {
  const { t } = useT();
  const [stats, setStats] = useState({ books_delivered: 0, beneficiary_schools: 0, volunteer_schools: 0, donors: 0 });
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    apiGet('/api/stats').then(setStats).catch(() => {});
    apiGet('/api/regions').then(setRegions).catch(() => setRegions([]));
  }, []);

  return (
    <>
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item"><div className="stat-number">{stats.books_delivered}+</div><div className="stat-label">{t('hero.statBooksDelivered')}</div></div>
          <div className="stat-item"><div className="stat-number">{stats.beneficiary_schools}</div><div className="stat-label">{t('hero.statSchools')}</div></div>
          <div className="stat-item"><div className="stat-number">{stats.volunteer_schools}</div><div className="stat-label">{t('schools.volunteer')}</div></div>
          <div className="stat-item"><div className="stat-number">{stats.donors}+</div><div className="stat-label">{t('hero.statDonors')}</div></div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag">{t('dashboard.regionsTag')}</div>
            <h2 className="section-title">{t('dashboard.geographicReach')}</h2>
          </div>
          <div className="mission-grid">
            {regions.map((r) => (
              <div key={r.region} className="mission-card">
                <span className="mc-icon">
                  <Icon name="mountain" size={22} />
                </span>
                <h4>{r.region}</h4>
                <p>{t('dashboard.schoolsCount', { count: r.count })}</p>
              </div>
            ))}
            {regions.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', maxWidth: 'none' }}>
                <p style={{ color: 'var(--text-subtle)', textAlign: 'center', margin: 0 }}>
                  {t('dashboard.noRegions')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
