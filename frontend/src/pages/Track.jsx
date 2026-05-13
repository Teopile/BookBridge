import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { apiGet } from '../api.js';

const STATUS_KEY = {
  pending: 'track.statusPending',
  at_volunteer: 'track.statusAtVolunteer',
  in_transit: 'track.statusInTransit',
  delivered: 'track.statusDelivered',
  cancelled: 'track.statusCancelled',
};

export default function Track() {
  const { token } = useParams();
  const { t } = useT();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiGet('/api/donations/track/' + token).then(setD).catch((e) => setErr(e.message));
  }, [token]);

  if (err) return <section className="section"><div className="card"><h2>Not found</h2><p>{err}</p></div></section>;
  if (!d) return <section className="section"><div className="card">Loading…</div></section>;

  return (
    <section className="section">
      <div className="card" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>{t('track.title')}</h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>Donation #{d.id.slice(0, 8)}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {Object.keys(STATUS_KEY).map((k) => {
            const idx = Object.keys(STATUS_KEY).indexOf(k);
            const currIdx = Object.keys(STATUS_KEY).indexOf(d.status);
            const reached = idx <= currIdx;
            return (
              <div key={k} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: 12, borderRadius: 10,
                background: reached ? 'rgba(45,139,122,0.08)' : 'var(--mist)',
                color: reached ? 'var(--ink)' : 'var(--soft-gray)',
              }}>
                <span style={{ fontSize: 20 }}>{reached ? '✅' : '⚪'}</span>
                <span style={{ fontWeight: idx === currIdx ? 700 : 400 }}>{t(STATUS_KEY[k])}</span>
              </div>
            );
          })}
        </div>

        {d.courier_tracking_id && (
          <p style={{ background: 'var(--mist)', padding: 12, borderRadius: 12, fontSize: 14 }}>
            📦 Courier tracking: <strong>{d.courier_tracking_id}</strong> ({d.courier_provider})
          </p>
        )}

        <h3 style={{ marginTop: 24, marginBottom: 12 }}>📚 Books</h3>
        <ul style={{ listStyle: 'none' }}>
          {(d.donation_items || []).map((i) => (
            <li key={i.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--mist)' }}>
              {i.book_title || i.book_author || i.book_genre} — × {i.quantity}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
