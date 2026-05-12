import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

export default function SchoolDetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const [school, setSchool] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/schools/' + id).then(setSchool).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <section className="section"><div className="card"><h2>{t('schools.empty')}</h2><p>{error}</p></div></section>;
  if (!school) return <section className="section"><div className="card">Loading…</div></section>;

  const totalNeeded = (school.book_requests || []).reduce((s, r) => s + r.quantity_needed, 0);
  const totalFulfilled = (school.book_requests || []).reduce((s, r) => s + r.quantity_fulfilled, 0);
  const pct = totalNeeded > 0 ? Math.min(100, Math.round((totalFulfilled / totalNeeded) * 100)) : 0;

  return (
    <section className="section">
      <div className="section-inner">
        <div className="card" style={{ maxWidth: 900 }}>
          <div className="school-card-header" style={{ borderRadius: 16, marginBottom: 24 }}>
            {school.type === 'volunteer' ? '🏫' : '🏔️'}
            <span className="school-badge">{t('schools.' + school.type)}</span>
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, marginBottom: 8 }}>{school.name}</h1>
          <div className="school-region" style={{ marginBottom: 24 }}>📍 {school.region} {school.city ? '· ' + school.city : ''}</div>
          {school.description && <p style={{ color: 'var(--soft-gray)', lineHeight: 1.7, marginBottom: 24 }}>{school.description}</p>}

          <div className="progress-bar-wrap">
            <div className="progress-label">
              <span>{t('schools.needsRequest')}</span>
              <span>{pct}% · {totalFulfilled}/{totalNeeded}</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: pct + '%' }} />
            </div>
          </div>

          <h3 style={{ marginTop: 32, marginBottom: 16, fontFamily: 'Cormorant Garamond, serif' }}>📚 Requested books</h3>
          {(school.book_requests || []).length === 0 && (
            <p style={{ color: 'var(--soft-gray)' }}>No requests yet.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(school.book_requests || []).map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--mist)', padding: '12px 16px', borderRadius: 12 }}>
                <div>
                  <strong>{r.title || r.author || r.genre}</strong>
                  <span style={{ color: 'var(--soft-gray)', marginLeft: 8, fontSize: 13 }}>({r.request_type})</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.quantity_fulfilled}/{r.quantity_needed}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={prefix + '/donate?school=' + school.id} className="btn-primary">📚 {t('schools.donate')}</Link>
            <Link to={prefix + '/schools'} className="btn-secondary">← All schools</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
