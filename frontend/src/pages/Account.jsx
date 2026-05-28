import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost, apiPut } from '../api.js';
import { Loading, ErrorState, EmptyState } from '../components/States.jsx';
import Icon from '../components/Icon.jsx';

const STATUS_KEY = {
  pending:       'track.statusPending',
  at_volunteer:  'track.statusAtVolunteer',
  in_transit:    'track.statusInTransit',
  delivered:     'track.statusDelivered',
  cancelled:     'track.statusCancelled',
};

const ACTIVE_STATUSES = ['pending', 'at_volunteer', 'in_transit'];

export default function Account() {
  const { t, lang, setLang } = useT();
  const prefix = '/' + lang;
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const [donations, setDonations] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  function loadDonations() {
    setError(null);
    apiGet('/api/donations/me').then(setDonations).catch((e) => setError(e.message));
  }

  useEffect(() => { if (user) loadDonations(); /* eslint-disable-next-line */ }, [user]);

  async function cancel(donationId) {
    if (!confirm(t('account.confirmCancel'))) return;
    try {
      await apiPost('/api/donations/' + donationId + '/cancel', {});
      loadDonations();
    } catch (e) { alert(e.message); }
  }

  if (authLoading) {
    return <section className="section"><div className="container" style={{ maxWidth: 720 }}><Loading /></div></section>;
  }
  if (!user) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 540 }}>
          <EmptyState
            icon={<Icon name="user" size={48} color="var(--forest-500)" />}
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

  const active  = donations?.filter((d) => ACTIVE_STATUSES.includes(d.status)) || [];
  const history = donations?.filter((d) => !ACTIVE_STATUSES.includes(d.status)) || [];

  const totalDonations = donations?.length || 0;
  const deliveredCount = donations?.filter((d) => d.status === 'delivered').length || 0;
  const totalBooks     = (donations || [])
    .filter((d) => d.status === 'delivered')
    .reduce((sum, d) => sum + (d.donation_items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-7)',
          flexWrap: 'wrap',
        }}>
          <div className="account-avatar">{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 'var(--fs-h2)', marginBottom: 2 }}>{username}</h1>
            <div style={{ color: 'var(--text-subtle)', fontSize: 'var(--fs-sm)' }}>{user.email}</div>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="btn btn-secondary btn-sm"
          >
            {editing ? t('common.cancel') : t('account.editProfile')}
          </button>
          <button onClick={logout} className="btn btn-ghost btn-sm">{t('nav.logout')}</button>
        </div>

        {editing && (
          <ProfileEditor
            profile={user.profile || {}}
            onSaved={() => { setEditing(false); refresh(); }}
            onCancel={() => setEditing(false)}
            t={t}
            currentLang={lang}
            setLang={setLang}
          />
        )}

        {/* Stats */}
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
            <h2 style={{ fontSize: 'var(--fs-h3)', marginBottom: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {t('account.activeDonations')}
              <span style={{ color: 'var(--text-subtle)', fontWeight: 'var(--fw-medium)', marginLeft: 'var(--space-2)' }}>· {active.length}</span>
            </h2>
            {active.length === 0 ? (
              <EmptyState
                icon={<Icon name="book" size={48} color="var(--forest-500)" />}
                title={t('account.noActive')}
                body={t('account.noActiveSub')}
                action={<Link to={prefix + '/donate'} className="btn btn-primary">{t('home.ctaPrimary')}</Link>}
              />
            ) : (
              <DonationList items={active} prefix={prefix} t={t} cancellable onCancel={cancel} />
            )}

            <h2 style={{ fontSize: 'var(--fs-h3)', marginBottom: 'var(--space-3)', marginTop: 'var(--space-7)' }}>
              {t('account.history')}
              <span style={{ color: 'var(--text-subtle)', fontWeight: 'var(--fw-medium)', marginLeft: 'var(--space-2)' }}>· {history.length}</span>
            </h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-subtle)' }}>—</p>
            ) : (
              <DonationList items={history} prefix={prefix} t={t} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ProfileEditor({ profile, onSaved, onCancel, t, currentLang, setLang }) {
  const [form, setForm] = useState({
    username:  profile.username  || '',
    full_name: profile.full_name || '',
    city:      profile.city      || '',
    language:  profile.language  || currentLang || 'en',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const patch = {};
      for (const k of Object.keys(form)) {
        if (form[k] !== '' && form[k] !== (profile[k] || '')) patch[k] = form[k];
      }
      if (Object.keys(patch).length === 0) { onCancel(); return; }
      await apiPut('/api/auth/me', patch);
      // Reflect language change in UI immediately if it was updated.
      if (patch.language && patch.language !== currentLang) setLang(patch.language);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 'none', margin: '0 0 var(--space-6)' }}>
      <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('account.editProfile')}</h3>
      <form className="form" onSubmit={submit}>
        <label>{t('auth.username')}</label>
        <input
          required minLength={3} maxLength={30}
          pattern="[A-Za-z0-9_\-]{3,30}"
          value={form.username}
          onChange={(e) => set('username', e.target.value)}
        />

        <label>{t('account.fullName')}</label>
        <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />

        <label>{t('account.city')}</label>
        <input value={form.city} onChange={(e) => set('city', e.target.value)} />

        <label>{t('account.language')}</label>
        <select value={form.language} onChange={(e) => set('language', e.target.value)}>
          <option value="en">English</option>
          <option value="ka">ქართული</option>
        </select>

        {err && <div className="error">{err}</div>}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? '…' : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

function DonationList({ items, prefix, t, cancellable, onCancel }) {
  return (
    <div className="row-list">
      {items.map((d) => {
        const itemCount = (d.donation_items || []).length;
        const bookCount = (d.donation_items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        return (
          <div key={d.id} className="row-item" style={{ flexWrap: 'wrap' }}>
            <Link to={prefix + '/track/' + d.track_token} className="row-item-main" style={{ color: 'var(--text-default)', textDecoration: 'none' }}>
              <div className="row-item-title">
                #{d.id.slice(0, 8)} ·{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>
                  {bookCount} {bookCount === 1 ? t('home.leaderboardBookOne') : t('home.leaderboardBookMany')}
                </span>
              </div>
              <div className="row-item-sub">
                {new Date(d.created_at).toLocaleDateString()} · {itemCount} {t('account.lineItems')}
              </div>
            </Link>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span className={'badge ' + d.status}>{t(STATUS_KEY[d.status] || 'common.errorTitle')}</span>
              {cancellable && (
                <button className="btn btn-ghost btn-sm" onClick={() => onCancel(d.id)}>
                  {t('account.cancelDonation')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
