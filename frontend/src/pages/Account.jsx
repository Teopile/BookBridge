import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet } from '../api.js';
import { Loading, ErrorState, EmptyState } from '../components/States.jsx';

const STATUS_KEY = {
  pending:       'track.statusPending',
  at_volunteer:  'track.statusAtVolunteer',
  in_transit:    'track.statusInTransit',
  delivered:     'track.statusDelivered',
  cancelled:     'track.statusCancelled',
};

export default function Account() {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const { user, loading: authLoading, logout } = useAuth();
  const [donations, setDonations] = useState(null);
  const [error, setError] = useState(null);

  function loadDonations() {
    setError(null);
    apiGet('/api/donations/me').then(setDonations).catch((e) => setError(e.message));
  }

  useEffect(() => { if (user) loadDonations(); /* eslint-disable-next-line */ }, [user]);

  if (authLoading) {
    return <section className="section"><div className="container" style={{ maxWidth: 720 }}><Loading /></div></section>;
  }
  if (!user) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 540 }}>
          <EmptyState
            icon="🔑"
            title={t('account.signinRequired')}
            body={t('account.signinHint')}
            action={<Link className="btn btn-primary btn-lg" to={prefix + '/auth'}>{t('auth.signin')} →</Link>}
          />
        </div>
      </section>
    );
  }

  const username = user.profile?.username || user.full_name || user.email;
  const initial  = (username || '?').slice(0, 1).toUpperCase();

  const activeStatuses = ['pending', 'at_volunteer', 'in_transit'];
  const active  = donations?.filter((d) => activeStatuses.includes(d.status)) || [];
  const history = donations?.filter((d) => !activeStatuses.includes(d.status)) || [];

  const totalDonations    = donations?.length || 0;
  const deliveredCount    = donations?.filter((d) => d.status === 'delivered').length || 0;
  const totalBooks        = (donations || [])
    .filter((d) => d.status === 'delivered')
    .reduce((sum, d) => sum + (d.donation_items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal), var(--teal-dark))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 22, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 28, marginBottom: 2 }}>{username}</h1>
            <div style={{ color: 'var(--gray-500)', fontSize: 14 }}>{user.email}</div>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-sm">{t('nav.logout')}</button>
        </div>

        <div className="dash-grid">
          <div className="dash-stat">
            <div className="dash-stat-n">{totalDonations}</div>
            <div className="dash-stat-l">{t('account.statTotal')}</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-n">{deliveredCount}</div>
            <div className="dash-stat-l">{t('account.statDelivered')}</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-n">{totalBooks}</div>
            <div className="dash-stat-l">{t('account.statBooks')}</div>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={loadDonations} />}

        {donations === null && !error && <Loading kind="list" />}

        {donations !== null && !error && (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 12, marginTop: 16 }}>
              {t('account.activeDonations')}
              <span style={{ color: 'var(--gray-500)', fontWeight: 500, marginLeft: 8 }}>· {active.length}</span>
            </h2>
            {active.length === 0 ? (
              <EmptyState
                icon="📚"
                title={t('account.noActive')}
                body={t('account.noActiveSub')}
                action={<Link to={prefix + '/donate'} className="btn btn-primary">{t('home.ctaPrimary')}</Link>}
              />
            ) : (
              <DonationList items={active} prefix={prefix} t={t} />
            )}

            <h2 style={{ fontSize: 20, marginBottom: 12, marginTop: 32 }}>
              {t('account.history')}
              <span style={{ color: 'var(--gray-500)', fontWeight: 500, marginLeft: 8 }}>· {history.length}</span>
            </h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--gray-500)' }}>—</p>
            ) : (
              <DonationList items={history} prefix={prefix} t={t} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function DonationList({ items, prefix, t }) {
  return (
    <div className="row-list">
      {items.map((d) => {
        const itemCount = (d.donation_items || []).length;
        const bookCount = (d.donation_items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        return (
          <Link key={d.id} to={prefix + '/track/' + d.track_token} className="row-item link">
            <div className="row-item-main">
              <div className="row-item-title">
                #{d.id.slice(0, 8)} ·{' '}
                <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>
                  {bookCount} {bookCount === 1 ? t('home.leaderboardBookOne') : t('home.leaderboardBookMany')}
                </span>
              </div>
              <div className="row-item-sub">
                {new Date(d.created_at).toLocaleDateString()} · {itemCount} {t('account.lineItems')}
              </div>
            </div>
            <span className={'badge ' + d.status}>{t(STATUS_KEY[d.status] || 'common.errorTitle')}</span>
          </Link>
        );
      })}
    </div>
  );
}
