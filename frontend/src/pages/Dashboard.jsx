import { useEffect, useState } from 'react';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

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
            <div className="section-tag">Regions</div>
            <h2 className="section-title">Geographic reach</h2>
          </div>
          <div className="mission-grid">
            {regions.map((r) => (
              <div key={r.region} className="mission-card">
                <span className="mc-icon">🏔️</span>
                <h4>{r.region}</h4>
                <p>{r.count} schools</p>
              </div>
            ))}
            {regions.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1' }}>
                <p style={{ color: 'var(--gray-500)', textAlign: 'center' }}>
                  No regions yet — once schools are approved they'll appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
