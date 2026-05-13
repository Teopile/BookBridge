import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

const FALLBACK_PHOTOS = [
  'https://picsum.photos/seed/bb-school-1/1200/450',
  'https://picsum.photos/seed/bb-school-2/1200/450',
  'https://picsum.photos/seed/bb-school-3/1200/450',
];
function photoFor(school) {
  if (school?.photo_url) return school.photo_url;
  if (!school?.id) return FALLBACK_PHOTOS[0];
  let h = 0; for (let i = 0; i < school.id.length; i++) h = (h * 31 + school.id.charCodeAt(i)) >>> 0;
  return FALLBACK_PHOTOS[h % FALLBACK_PHOTOS.length];
}

export default function SchoolDetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const [school, setSchool] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/schools/' + id).then(setSchool).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <section className="section">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h2 style={{ marginBottom: 8 }}>{t('schools.empty')}</h2>
          <p style={{ color: 'var(--gray-700)', marginBottom: 24 }}>{error}</p>
          <Link to={prefix + '/schools'} className="btn btn-secondary">← {t('schools.backToAll')}</Link>
        </div>
      </section>
    );
  }
  if (!school) {
    return (
      <section className="section">
        <div className="card" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
          {t('common.loading')}
        </div>
      </section>
    );
  }

  const totalNeeded    = (school.book_requests || []).reduce((a, r) => a + r.quantity_needed, 0);
  const totalFulfilled = (school.book_requests || []).reduce((a, r) => a + r.quantity_fulfilled, 0);
  const pct = totalNeeded > 0 ? Math.min(100, Math.round((totalFulfilled / totalNeeded) * 100)) : 0;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div style={{
          aspectRatio: '3 / 1',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 24,
          position: 'relative',
          background: 'var(--gray-100)',
        }}>
          <img src={photoFor(school)} alt={school.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))',
          }} />
          <div style={{ position: 'absolute', left: 24, bottom: 20, right: 24, color: 'white' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
              {t('schools.' + school.type)}
            </div>
            <h1 style={{ color: 'white', fontSize: 34, marginTop: 8, marginBottom: 2 }}>{school.name}</h1>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              📍 {school.region}{school.city ? ' · ' + school.city : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Link to={prefix + '/donate?school=' + school.id} className="btn btn-primary btn-lg">
            {t('home.donateToSchool')}
          </Link>
          <Link to={prefix + '/schools'} className="btn btn-secondary">
            ← {t('schools.backToAll')}
          </Link>
        </div>

        {school.description && (
          <div className="card" style={{ maxWidth: 'none', margin: '0 0 24px' }}>
            <p style={{ color: 'var(--gray-700)', lineHeight: 1.7, margin: 0 }}>
              {school.description}
            </p>
          </div>
        )}

        <div className="card" style={{ maxWidth: 'none', margin: '0 0 24px' }}>
          <div className="progress-meta" style={{ marginBottom: 6 }}>
            <span>{t('schools.needsRequest')}</span>
            <strong>{pct}% · {totalFulfilled}/{totalNeeded}</strong>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: pct + '%' }} />
          </div>
        </div>

        <h3 style={{ marginBottom: 12 }}>📚 {t('schools.requestedBooks')}</h3>
        {(school.book_requests || []).length === 0 ? (
          <div className="card" style={{ maxWidth: 'none', margin: 0, color: 'var(--gray-500)' }}>
            {t('schools.noRequests')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {school.book_requests.map((r) => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'white', padding: '14px 18px', borderRadius: 10,
                border: '1px solid var(--gray-200)',
              }}>
                <div>
                  <strong>{r.title || r.author || r.genre}</strong>
                  <span style={{ color: 'var(--gray-500)', marginLeft: 8, fontSize: 13 }}>
                    ({r.request_type})
                  </span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--teal)' }}>
                  {r.quantity_fulfilled}/{r.quantity_needed}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link to={prefix + '/donate?school=' + school.id} className="btn btn-primary btn-lg">
            {t('home.donateToSchool')}
          </Link>
        </div>
      </div>
    </section>
  );
}
