import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import Icon from '../components/Icon.jsx';
import StampLabel from '../components/StampLabel.jsx';
import { Loading } from '../components/States.jsx';

// Local placeholder (frontend/public/heroes/) until schools have real photos.
const FALLBACK_COVER = '/heroes/school-cover.jpg';
function photoFor(school) {
  return school?.photo_url || FALLBACK_COVER;
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
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>{t('schools.emptyHint')}</p>
          <Link to={prefix + '/schools'} className="btn btn-secondary">← {t('schools.backToAll')}</Link>
        </div>
      </section>
    );
  }
  if (!school) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <Loading kind="banner" />
        </div>
      </section>
    );
  }

  const totalNeeded    = (school.book_requests || []).reduce((a, r) => a + r.quantity_needed, 0);
  const totalFulfilled = (school.book_requests || []).reduce((a, r) => a + r.quantity_fulfilled, 0);
  const pct = totalNeeded > 0 ? Math.min(100, Math.round((totalFulfilled / totalNeeded) * 100)) : 0;

  const requestCount = (school.book_requests || []).length;

  return (
    <section className="section">
      <div className="container">
        {/* Full-width cover header (MyHome broker-page pattern): edge-to-edge
            cover, avatar overlapping bottom-left, info row, CTA on the right. */}
        <div className="cover-header">
          <div className="cover-photo">
            <img src={photoFor(school)} alt={school.name}
              width={1600} height={400} decoding="async" fetchpriority="high" />
          </div>
          <div className="cover-info">
            <div className="cover-avatar">
              <img src={photoFor(school)} alt="" width={96} height={96} decoding="async" />
            </div>
            <div className="cover-meta">
              <span
                className="badge"
                style={{ background: 'var(--forest-50)', color: 'var(--forest-700)' }}
              >
                {t('schools.' + school.type)}
              </span>
              <h1>{school.name}</h1>
              <div className="cover-facts">
                <span>
                  <Icon name="pin" size={16} color="var(--forest-600)" />
                  {school.region}{school.city ? ' · ' + school.city : ''}
                </span>
                <span>
                  <Icon name="books" size={16} color="var(--forest-600)" />
                  {t('schools.requestsCount', { count: requestCount })}
                </span>
                {totalNeeded > 0 && (
                  <span>
                    <Icon name="check" size={16} color="var(--forest-600)" />
                    {pct}% {t('home.fulfilledLabel').toLowerCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="cover-cta">
              <Link to={prefix + '/donate?school=' + school.id} className="btn btn-primary btn-lg">
                {t('home.donateToSchool')}
              </Link>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link to={prefix + '/schools'} className="btn btn-ghost btn-sm">
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

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <StampLabel>{t('home.schoolsStamp')}</StampLabel>
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
                <div key={r.id} className="row-card">
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
