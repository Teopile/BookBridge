import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';
import { Loading, ErrorState, EmptyState } from '../components/States.jsx';

const STATUS_ORDER = ['pending', 'at_volunteer', 'in_transit', 'delivered'];
const STATUS_KEY = {
  pending:       'track.statusPending',
  at_volunteer:  'track.statusAtVolunteer',
  in_transit:    'track.statusInTransit',
  delivered:     'track.statusDelivered',
  cancelled:     'track.statusCancelled',
};

const BANNER = 'https://picsum.photos/seed/bb-track/900/300';

export default function Track() {
  const { token } = useParams();
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  function load() {
    setErr(null);
    apiGet('/api/donations/track/' + token).then(setD).catch((e) => setErr(e.message));
  }

  useEffect(load, [token]);

  if (err) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <ErrorState message={err} onRetry={load} />
        </div>
      </section>
    );
  }
  if (!d) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <Loading kind="banner" />
          <Loading kind="list" />
        </div>
      </section>
    );
  }

  const currentStatusIdx = STATUS_ORDER.indexOf(d.status);
  const isCancelled = d.status === 'cancelled';
  const itemCount = (d.donation_items || []).length;
  const bookCount = (d.donation_items || []).reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="page-banner">
          <img src={BANNER} alt="" width={900} height={300} loading="lazy" decoding="async" />
          <div className="page-banner-overlay" />
          <div className="page-banner-content">
            <div className="page-banner-eyebrow">{t('track.eyebrow')}</div>
            <h1>{t('track.title')}</h1>
            <div className="page-banner-meta">
              #{d.id.slice(0, 8)} · {bookCount} {bookCount === 1 ? t('home.leaderboardBookOne') : t('home.leaderboardBookMany')}
            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 'none', margin: '0 0 var(--space-6)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            {t('track.currentStatus')}
          </div>
          <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-bold)', color: 'var(--forest-700)', marginBottom: 'var(--space-1)' }}>
            {t(STATUS_KEY[d.status])}
          </div>
          {d.courier_tracking_id && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              📦 {d.courier_provider}: <strong>{d.courier_tracking_id}</strong>
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-3)' }}>{t('track.timeline')}</h2>
        <div className="card" style={{ maxWidth: 'none', margin: '0 0 var(--space-6)' }}>
          <div className="timeline">
            {STATUS_ORDER.map((s, i) => {
              const stateClass =
                isCancelled
                  ? 'future'
                  : i < currentStatusIdx ? 'done'
                  : i === currentStatusIdx ? 'done active'
                  : 'future';
              const history = (d.donation_status_history || []).find((h) => h.to_status === s);
              return (
                <div key={s} className={'timeline-item ' + stateClass}>
                  <div className="timeline-dot">{i < currentStatusIdx || (i === currentStatusIdx && !isCancelled) ? '✓' : i + 1}</div>
                  <div className="timeline-body">
                    <div className="timeline-label">{t(STATUS_KEY[s])}</div>
                    {history?.changed_at && (
                      <div className="timeline-meta">{new Date(history.changed_at).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {isCancelled && (
              <div className="timeline-item done">
                <div className="timeline-dot">✕</div>
                <div className="timeline-body">
                  <div className="timeline-label">{t(STATUS_KEY.cancelled)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-3)' }}>📚 {t('track.books')}</h2>
        {itemCount === 0 ? (
          <EmptyState icon="📚" title={t('track.noBooks')} />
        ) : (
          <div className="row-list">
            {(d.donation_items || []).map((i) => (
              <div className="row-item" key={i.id}>
                <div className="row-item-main">
                  <div className="row-item-title">{i.book_title || i.book_author || i.book_genre || '—'}</div>
                  <div className="row-item-sub">{i.book_author || i.book_genre || ''}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>× {i.quantity}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link to={prefix} className="btn btn-secondary">{t('common.back')} {t('nav.home')}</Link>
        </div>
      </div>
    </section>
  );
}
