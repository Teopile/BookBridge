import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost } from '../api.js';
import { Loading, ErrorState, EmptyState } from '../components/States.jsx';

const BANNER = 'https://picsum.photos/seed/bb-volunteer/1200/420';

const STATUS_KEY = {
  pending:       'track.statusPending',
  at_volunteer:  'track.statusAtVolunteer',
  in_transit:    'track.statusInTransit',
  delivered:     'track.statusDelivered',
  cancelled:     'track.statusCancelled',
};

export default function VolunteerManage() {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const { user, loading: authLoading } = useAuth();
  const [schools, setSchools] = useState(null);
  const [selected, setSelected] = useState(null);
  const [donations, setDonations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setError(null);
    apiGet('/api/volunteer/my-schools')
      .then((list) => {
        setSchools(list);
        if (list.length && !selected) setSelected(list[0].id);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line
  }, [user]);

  function reload() {
    if (selected) {
      setDonations(null);
      apiGet('/api/volunteer/incoming/' + selected).then(setDonations).catch(() => setDonations([]));
    }
  }
  useEffect(reload, [selected]);

  async function setStatus(donationId, status) {
    try {
      await apiPost('/api/volunteer/donations/' + donationId + '/status', { status });
      reload();
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
            icon="🔑"
            title={t('account.signinRequired')}
            body={t('account.signinHint')}
            action={<Link className="btn btn-primary btn-lg" to={prefix + '/auth'}>{t('auth.signin')} →</Link>}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="page-banner">
          <img src={BANNER} alt="" />
          <div className="page-banner-overlay" />
          <div className="page-banner-content">
            <div className="page-banner-eyebrow">{t('volunteerManage.eyebrow')}</div>
            <h1>{t('volunteerManage.title')}</h1>
            <div className="page-banner-meta">{t('volunteerManage.subtitle')}</div>
          </div>
        </div>

        {error && <ErrorState message={error} />}

        {schools === null && !error && <Loading kind="list" />}

        {schools && schools.length === 0 && (
          <EmptyState
            icon="🏫"
            title={t('volunteerManage.noSchoolTitle')}
            body={t('volunteerManage.noSchoolBody')}
            action={<Link className="btn btn-primary" to={prefix + '/school/manage'}>{t('donate.registerSchool')} →</Link>}
          />
        )}

        {schools && schools.length > 0 && (
          <>
            <div className="card" style={{ maxWidth: 'none', margin: '0 0 24px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                {t('volunteerManage.pickSchool')}
              </label>
              <select
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--gray-200)', fontSize: 15, background: 'white' }}
                value={selected || ''}
                onChange={(e) => setSelected(e.target.value)}
              >
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <h2 style={{ fontSize: 20, marginBottom: 12 }}>{t('volunteerManage.incoming')}</h2>

            {donations === null && <Loading kind="list" />}

            {donations !== null && donations.length === 0 && (
              <EmptyState icon="📭" title={t('volunteerManage.noIncoming')} />
            )}

            {donations !== null && donations.length > 0 && (
              <div className="row-list">
                {donations.map((d) => (
                  <div className="row-item" key={d.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div className="row-item-title">
                        #{d.id.slice(0, 8)} →{' '}
                        <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>
                          {d.beneficiary_school?.name || t('volunteerManage.autoPick')}
                        </span>
                      </div>
                      <span className={'badge ' + d.status}>{t(STATUS_KEY[d.status] || 'common.errorTitle')}</span>
                    </div>
                    <div className="row-item-sub" style={{ marginBottom: 12 }}>
                      {(d.donation_items || []).length} {t('account.lineItems')} · {d.delivery_method}
                      {d.courier_tracking_id ? ' · 📦 ' + d.courier_tracking_id : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {d.status === 'pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setStatus(d.id, 'at_volunteer')}>
                          ✓ {t('volunteerManage.markReceived')}
                        </button>
                      )}
                      {(d.status === 'pending' || d.status === 'at_volunteer') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setStatus(d.id, 'in_transit')}>
                          🚚 {t('volunteerManage.markShipped')}
                        </button>
                      )}
                      <Link to={prefix + '/track/' + d.track_token} className="btn btn-ghost btn-sm">
                        {t('volunteerManage.viewTrack')} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
