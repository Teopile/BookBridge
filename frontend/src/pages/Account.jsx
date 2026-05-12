import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet } from '../api.js';

export default function Account() {
  const { t, lang } = useT();
  const { user, loading } = useAuth();
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    if (user) apiGet('/api/donations/me').then(setDonations).catch(() => setDonations([]));
  }, [user]);

  if (loading) return <section className="section"><div className="card">Loading…</div></section>;
  if (!user) {
    return (
      <section className="section">
        <div className="card">
          <h2>{t('auth.signin')}</h2>
          <p style={{ color: 'var(--soft-gray)', marginTop: 8 }}>{t('auth.haveAccount')}</p>
          <div style={{ marginTop: 16 }}>
            <Link className="btn-primary" to={'/' + lang + '/auth'}>{t('auth.submit')} →</Link>
          </div>
        </div>
      </section>
    );
  }

  const active = donations.filter((d) => d.status !== 'delivered' && d.status !== 'cancelled');
  const history = donations.filter((d) => d.status === 'delivered' || d.status === 'cancelled');

  return (
    <section className="section">
      <div className="section-inner">
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, marginBottom: 24 }}>
          {t('account.title')} — {user.full_name || user.email}
        </h1>

        <h2 style={{ marginTop: 24, marginBottom: 12 }}>{t('account.activeDonations')}</h2>
        {active.length === 0 ? (
          <p style={{ color: 'var(--soft-gray)' }}>{t('account.empty')}</p>
        ) : (
          <DonationList items={active} lang={lang} t={t} />
        )}

        <h2 style={{ marginTop: 40, marginBottom: 12 }}>{t('account.history')}</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--soft-gray)' }}>—</p>
        ) : (
          <DonationList items={history} lang={lang} t={t} />
        )}
      </div>
    </section>
  );
}

function DonationList({ items, lang, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((d) => (
        <Link key={d.id} to={'/' + lang + '/track/' + d.track_token} className="card" style={{ display: 'block', marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>#{d.id.slice(0, 8)}</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--soft-gray)' }}>
                {new Date(d.created_at).toLocaleDateString()}
              </span>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--mist)', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
              {d.status}
            </span>
          </div>
          <p style={{ marginTop: 8, color: 'var(--soft-gray)', fontSize: 14 }}>
            {(d.donation_items || []).length} item(s) · {d.delivery_method}
          </p>
        </Link>
      ))}
    </div>
  );
}
