import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost } from '../api.js';

export default function VolunteerManage() {
  const { t, lang } = useT();
  const { user, loading } = useAuth();
  const [schools, setSchools] = useState([]);
  const [selected, setSelected] = useState(null);
  const [donations, setDonations] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiGet('/api/volunteer/my-schools')
      .then((list) => {
        setSchools(list);
        if (list.length && !selected) setSelected(list[0].id);
      })
      .catch((e) => setErr(e.message));
    // eslint-disable-next-line
  }, [user]);

  function reload() {
    if (selected) apiGet('/api/volunteer/incoming/' + selected).then(setDonations).catch(() => setDonations([]));
  }
  useEffect(reload, [selected]);

  async function setStatus(donationId, status) {
    try {
      await apiPost('/api/volunteer/donations/' + donationId + '/status', { status });
      reload();
    } catch (e) { alert(e.message); }
  }

  if (loading) return <section className="section"><div className="card">Loading…</div></section>;
  if (!user) return (
    <section className="section"><div className="card">
      <h2>Sign in required</h2>
      <Link className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }} to={'/' + lang + '/auth'}>{t('auth.signin')}</Link>
    </div></section>
  );

  return (
    <section className="section">
      <div className="section-inner">
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, marginBottom: 24 }}>
          🚚 Volunteer dashboard
        </h1>

        {schools.length === 0 ? (
          <div className="card">
            <p>You don't own a volunteer school yet.</p>
            <Link className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }} to={'/' + lang + '/school/manage'}>
              Register one →
            </Link>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Your volunteer schools</label>
              <select style={{ marginTop: 8, padding: 12, borderRadius: 12, border: '2px solid var(--mist)', width: '100%' }}
                value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <h2 style={{ margin: '24px 0 12px' }}>Incoming donations</h2>
            {donations.length === 0 ? (
              <div className="card" style={{ color: 'var(--soft-gray)' }}>No incoming donations.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {donations.map((d) => (
                  <div key={d.id} className="card" style={{ marginTop: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>#{d.id.slice(0, 8)}</strong>
                        <span style={{ marginLeft: 12, color: 'var(--soft-gray)', fontSize: 13 }}>
                          → {d.beneficiary_school?.name || 'auto-pick'}
                        </span>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--mist)', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                        {d.status}
                      </span>
                    </div>
                    <p style={{ marginTop: 8, color: 'var(--soft-gray)', fontSize: 14 }}>
                      {(d.donation_items || []).length} item(s) · {d.delivery_method}
                      {d.courier_tracking_id ? ' · 📦 ' + d.courier_tracking_id : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {d.status === 'pending' && (
                        <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setStatus(d.id, 'at_volunteer')}>
                          ✓ Received at school
                        </button>
                      )}
                      {(d.status === 'pending' || d.status === 'at_volunteer') && (
                        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setStatus(d.id, 'in_transit')}>
                          🚚 Shipped to beneficiary
                        </button>
                      )}
                      <Link to={'/' + lang + '/track/' + d.track_token} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
                        Track →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {err && <div className="card error">{err}</div>}
      </div>
    </section>
  );
}
