import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from './api.js';

const STATUS_LABEL = {
  pending:       'Pending',
  at_volunteer:  'At volunteer',
  in_transit:    'In transit',
  delivered:     'Delivered',
  cancelled:     'Cancelled',
  approved:      'Approved',
  rejected:      'Rejected',
};

// ============================================================
//  Root
// ============================================================
export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    apiGet('/api/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="center-screen muted">Loading…</div>;
  if (!user) return <Login onLogin={() => apiGet('/api/auth/me').then((d) => setUser(d.user))} />;
  if (user.role !== 'admin') return <NoAccess email={user.email} />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">📚</div>
          <div className="sidebar-logo-text">BookBridge</div>
        </div>
        <NavLink to="/" end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>Dashboard</NavLink>
        <NavLink to="/schools" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>School queue</NavLink>
        <NavLink to="/donations" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>Donations</NavLink>
        <NavLink to="/content" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>Site content</NavLink>

        <div className="sidebar-spacer" />
        <div className="sidebar-user">
          Signed in as
          <div className="sidebar-user-email">{user.email}</div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 8 }}
          onClick={async () => { await apiPost('/api/auth/logout', {}); window.location.reload(); }}
        >
          Sign out
        </button>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/schools"   element={<SchoolsQueue />} />
          <Route path="/donations" element={<DonationsList />} />
          <Route path="/content"   element={<SiteContent />} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// ============================================================
//  Login
// ============================================================
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/auth/login', { email, password });
      onLogin();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="center-screen">
      <div className="card" style={{ width: 360, margin: 0 }}>
        <h2 style={{ marginBottom: 16 }}>Admin sign in</h2>
        <form className="form" onSubmit={submit}>
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy} type="submit">
            {busy ? '…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function NoAccess({ email }) {
  return (
    <div className="center-screen">
      <div className="card" style={{ width: 460, margin: 0, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 16 }}>Not an admin</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          {email} is signed in but doesn't have admin role. Run this in Supabase SQL Editor:
        </p>
        <pre style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 8, fontSize: 12, textAlign: 'left', overflow: 'auto' }}>
{`update profiles set role = 'admin'
where id = (select id from auth.users
where email = '${email}');`}
        </pre>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={async () => { await apiPost('/api/auth/logout', {}); window.location.reload(); }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ============================================================
//  Dashboard
// ============================================================
function Dashboard() {
  const [stats, setStats] = useState({ books_delivered: 0, beneficiary_schools: 0, volunteer_schools: 0, donors: 0 });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    apiGet('/api/stats').then(setStats).catch(() => {});
    apiGet('/api/admin/schools/pending').then((r) => setPendingCount((r || []).length)).catch(() => {});
  }, []);

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Quick overview of platform activity.</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="n">{stats.books_delivered}</div><div className="l">Books delivered</div></div>
        <div className="stat-card"><div className="n">{stats.beneficiary_schools}</div><div className="l">Beneficiary schools</div></div>
        <div className="stat-card"><div className="n">{stats.volunteer_schools}</div><div className="l">Volunteer schools</div></div>
        <div className="stat-card"><div className="n">{stats.donors}</div><div className="l">Donors</div></div>
      </div>

      <div className="card">
        <h3>Quick actions</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.9, color: 'var(--gray-700)' }}>
          {pendingCount > 0 && (
            <li><a href="/schools"><strong>{pendingCount}</strong> school{pendingCount === 1 ? '' : 's'} awaiting approval →</a></li>
          )}
          <li><a href="/donations">Browse donations</a></li>
          <li><a href="/content">Edit homepage copy</a></li>
          <li><a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Open Supabase Dashboard ↗</a></li>
        </ul>
      </div>
    </>
  );
}

// ============================================================
//  Schools queue
// ============================================================
function SchoolsQueue() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);

  function load() { apiGet('/api/admin/schools/pending').then(setItems).catch(() => setItems([])); }
  useEffect(load, []);

  async function decide(id, status) {
    setBusy(id);
    try {
      await apiPost('/api/admin/schools/' + id + '/approval', { status });
      load();
    } catch (e) { alert(e.message); } finally { setBusy(null); }
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>School queue</h1>
          <div className="sub">Pending schools awaiting your approval.</div>
        </div>
      </div>

      {items === null && <div className="table-empty">Loading…</div>}

      {items !== null && items.length === 0 && (
        <div className="table-empty">No schools waiting for review.</div>
      )}

      {items && items.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Region</th><th>Owner</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td>{s.type}</td>
                <td>{s.region}</td>
                <td className="muted">{s.owner_user_id?.slice(0, 8)}</td>
                <td className="muted">{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row">
                    <button className="btn btn-primary btn-sm" disabled={busy === s.id} onClick={() => decide(s.id, 'approved')}>Approve</button>
                    <button className="btn btn-danger btn-sm" disabled={busy === s.id} onClick={() => decide(s.id, 'rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// ============================================================
//  Donations list
// ============================================================
function DonationsList() {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);

  function load() {
    setItems(null);
    const q = status ? '?status=' + status : '';
    apiGet('/api/admin/donations' + q)
      .then((r) => { setItems(r.items || []); setTotal(r.total || 0); })
      .catch(() => setItems([]));
  }
  useEffect(load, [status]);

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Donations</h1>
          <div className="sub">{total} total · click any row to update status.</div>
        </div>
        <select className="input" style={{ maxWidth: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="at_volunteer">At volunteer</option>
          <option value="in_transit">In transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {items === null && <div className="table-empty">Loading…</div>}

      {items !== null && items.length === 0 && (
        <div className="table-empty">No donations match this filter.</div>
      )}

      {items && items.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Beneficiary</th>
              <th>Volunteer</th>
              <th>Items</th>
              <th>Delivery</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const itemCount = (d.donation_items || []).length;
              return (
                <tr key={d.id}>
                  <td className="muted">#{d.id.slice(0, 8)}</td>
                  <td>{d.beneficiary_school?.name || '—'}</td>
                  <td>{d.volunteer_school?.name || '—'}</td>
                  <td>{itemCount}</td>
                  <td>{d.delivery_method}</td>
                  <td><span className={'badge ' + d.status}>{STATUS_LABEL[d.status] || d.status}</span></td>
                  <td className="muted">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(d)}>Update</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected && (
        <DonationStatusModal donation={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />
      )}
    </>
  );
}

function DonationStatusModal({ donation, onClose, onSaved }) {
  const [status, setStatus] = useState(donation.status);
  const [trackingId, setTrackingId] = useState(donation.courier_tracking_id || '');
  const [note, setNote] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiPost(`/api/admin/donations/${donation.id}/status`, {
        status,
        courier_tracking_id: trackingId || undefined,
        note: note || undefined,
      });
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'grid', placeItems: 'center', padding: 24, zIndex: 100,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: 460, margin: 0 }}>
        <h3>Update donation #{donation.id.slice(0, 8)}</h3>
        <form className="form" onSubmit={submit} style={{ marginTop: 16 }}>
          <label>Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="at_volunteer">At volunteer</option>
            <option value="in_transit">In transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <label>Courier tracking ID (optional)</label>
          <input className="input" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />

          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />

          {err && <div className="error">{err}</div>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
//  Site content CMS
// ============================================================
function SiteContent() {
  const [rows, setRows] = useState(null);
  const [edits, setEdits] = useState({});  // key -> { value_en, value_ka }
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [err, setErr] = useState(null);

  function load() {
    apiGet('/api/admin/content')
      .then((r) => { setRows(r); setEdits({}); })
      .catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  function setField(key, lang, val) {
    setEdits((prev) => {
      const current = prev[key] || {};
      return { ...prev, [key]: { ...current, [lang]: val } };
    });
  }

  async function save(key) {
    const row = rows.find((r) => r.key === key) || { value_en: null, value_ka: null };
    const ed = edits[key] || {};
    setSaving(key); setErr(null);
    try {
      await apiPut('/api/admin/content', {
        key,
        value_en: ed.value_en !== undefined ? ed.value_en : row.value_en,
        value_ka: ed.value_ka !== undefined ? ed.value_ka : row.value_ka,
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 1500);
      load();
    } catch (e) { setErr(e.message); }
    finally { setSaving(null); }
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Site content</h1>
          <div className="sub">Edit homepage strings in English and Georgian.</div>
        </div>
      </div>

      {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

      {rows === null && <div className="table-empty">Loading…</div>}

      {rows && rows.length === 0 && (
        <div className="table-empty">No content keys yet. Add some via the database.</div>
      )}

      {rows && rows.length > 0 && rows.map((r) => {
        const currentEn = edits[r.key]?.value_en !== undefined ? edits[r.key].value_en : (r.value_en || '');
        const currentKa = edits[r.key]?.value_ka !== undefined ? edits[r.key].value_ka : (r.value_ka || '');
        const dirty = edits[r.key] !== undefined;
        return (
          <div key={r.key} className="card">
            <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <code style={{ fontSize: 14 }}>{r.key}</code>
              {saved === r.key && <span className="ok">✓ Saved</span>}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: 4 }}>English</label>
                <textarea
                  className="input"
                  rows={3}
                  value={currentEn}
                  onChange={(e) => setField(r.key, 'value_en', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: 4 }}>ქართული</label>
                <textarea
                  className="input"
                  rows={3}
                  value={currentKa}
                  onChange={(e) => setField(r.key, 'value_ka', e.target.value)}
                />
              </div>
            </div>

            <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary btn-sm"
                disabled={!dirty || saving === r.key}
                onClick={() => save(r.key)}
              >
                {saving === r.key ? '…' : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
