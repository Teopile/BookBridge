import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Icon from '../components/Icon.jsx';

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

// Book-icon progress row: filled (honey) vs outlined (border) so kids see "books found / books needed".
function BookProgress({ fulfilled, needed }) {
  const cap = Math.max(needed, 1);
  return (
    <div className="progress-books-row" aria-label={fulfilled + ' of ' + needed}>
      {Array.from({ length: cap }).map((_, i) => (
        <Icon
          key={i}
          name="book"
          size={18}
          color={i < fulfilled ? 'var(--honey-400)' : 'var(--border-default)'}
          fill={i < fulfilled ? 'var(--honey-400)' : 'none'}
          stroke={1.5}
        />
      ))}
    </div>
  );
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
        <div className="state">
          <div className="state-icon">
            <Icon name="search" size={48} color="var(--forest-500)" />
          </div>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>{t('schools.empty')}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>{error}</p>
          <Link to={prefix + '/schools'} className="btn btn-secondary">← {t('schools.backToAll')}</Link>
        </div>
      </section>
    );
  }
  if (!school) {
    return (
      <section className="section">
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-subtle)' }}>
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
        {/* Photo + soft cream gradient (no dark overlay) */}
        <div style={{
          aspectRatio: '5 / 2',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          marginBottom: 'var(--space-4)',
          position: 'relative',
          background: 'var(--cream-card)',
          boxShadow: 'var(--sh-1)',
        }}>
          <img src={photoFor(school)} alt={school.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(245, 240, 228, 0.95), rgba(245, 240, 228, 0) 60%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* School name card below photo */}
        <div className="card" style={{
          maxWidth: 'none',
          margin: '0 0 var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <span
            className="badge"
            style={{
              alignSelf: 'flex-start',
              background: 'var(--forest-50)',
              color: 'var(--forest-700)',
            }}
          >
            {t('schools.' + school.type)}
          </span>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>{school.name}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-base)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <Icon name="pin" size={16} color="var(--forest-600)" />
            {school.region}{school.city ? ' · ' + school.city : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          <Link to={prefix + '/donate?school=' + school.id} className="btn btn-primary btn-lg">
            {t('home.donateToSchool')}
          </Link>
          <Link to={prefix + '/schools'} className="btn btn-ghost">
            ← {t('schools.backToAll')}
          </Link>
        </div>

        {school.description && (
          <div className="card" style={{ maxWidth: 'none', margin: '0 0 var(--space-6)' }}>
            <p style={{ color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)', margin: 0 }}>
              {school.description}
            </p>
          </div>
        )}

        <div className="card" style={{ maxWidth: 'none', margin: '0 0 var(--space-6)' }}>
          <div className="progress-meta" style={{ marginBottom: 'var(--space-1)' }}>
            <span>{t('schools.needsRequest')}</span>
            <strong style={{ color: 'var(--forest-700)' }}>{pct}% · {totalFulfilled}/{totalNeeded}</strong>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: pct + '%' }} />
          </div>
        </div>

        <h3 style={{ marginBottom: 'var(--space-3)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Icon name="books" size={22} color="var(--forest-600)" />
          {t('schools.requestedBooks')}
        </h3>
        {(school.book_requests || []).length === 0 ? (
          <div className="card" style={{ maxWidth: 'none', margin: 0, color: 'var(--text-subtle)' }}>
            {t('schools.noRequests')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {school.book_requests.map((r) => {
              const cap = Math.min(r.quantity_needed, 12);
              const filled = Math.min(r.quantity_fulfilled, cap);
              return (
                <div key={r.id} style={{
                  background: 'var(--surface)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <strong>{r.title || r.author || r.genre}</strong>
                      <span style={{ color: 'var(--text-subtle)', marginLeft: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
                        ({r.request_type})
                      </span>
                    </div>
                    <span style={{
                      fontWeight: 'var(--fw-bold)',
                      color: 'var(--forest-700)',
                      fontSize: 'var(--fs-sm)',
                    }}>
                      {r.quantity_fulfilled} / {r.quantity_needed}
                    </span>
                  </div>
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <BookProgress fulfilled={filled} needed={cap} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 'var(--space-9)', textAlign: 'center' }}>
          <Link to={prefix + '/donate?school=' + school.id} className="btn btn-primary btn-lg">
            {t('home.donateToSchool')}
          </Link>
        </div>
      </div>
    </section>
  );
}
