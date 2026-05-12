import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    apiGet('/api/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="empty">Loading…</div>;
  if (!user) return <Login onLogin={() => apiGet('/api/auth/me').then((d) => setUser(d.user))} />;
  if (user.role !== 'admin') return <NoAccess email={user.email} />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>📚 BookBridge Admin</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/schools">School queue</NavLink>
          <NavLink to="/donations">Donations</NavLink>
        </nav>
        <div style={{ marginTop: 32, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Signed in as {user.email}
        </div>
        <button
          className="btn secondary"
          style={{ margin: '12px 14px', width: 'calc(100% - 28px)' }}
          onClick={async () => { await apiPost('/api/auth/logout', {}); window.location.reload(); }}
        >Sign out</button>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/schools" element={<SchoolsQueue />} />
          <Route path="/donations" element={<DonationsList />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

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
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: 360 }}>
        <h2>Admin sign in</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <div className="error">{err}</div>}
          <button className="btn" disabled={busy}>{busy ? '…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}

function NoAccess({ email }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: 420, textAlign: 'center' }}>
        <h2>Not an admin</h2>
        <p style={{ color: 'var(--soft)', marginTop: 8 }}>
          {email} is signed in but doesn't have admin role. Run this in Supabase SQL Editor:
        </p>
        <pre style={{ background: 'var(--mist)', padding: 12, marginTop: 12, borderRadius: 8, fontSize: 12, textAlign: 'left', overflow: 'auto' }}>
{`update profiles set role = 'admin'
where id = (select id from auth.users
where email = '${email}');`}
        </pre>
        <button className="btn secondary" style={{ marginTop: 16 }} onClick={async () => {
          await apiPost('/api/auth/logout', {}); window.location.reload();
        }}>Sign out</button>
      </div>
    </div>
  );
}

function AdminHome() {
  const [stats, setStats] = useState({ books_delivered: 0, beneficiary_schools: 0, volunteer_schools: 0, donors: 0 });
  useEffect(() => { apiGet('/api/stats').then(setStats).catch(() => {}); }, []);
  return (
    <>
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card"><div className="n">{stats.books_delivered}</div><div className="l">Books delivered</div></div>
        <div className="stat-card"><div className="n">{stats.beneficiary_schools}</div><div className="l">Beneficiary schools</div></div>
        <div className="stat-card"><div className="n">{stats.volunteer_schools}</div><div className="l">Volunteer schools</div></div>
        <div className="stat-card"><div className="n">{stats.donors}</div><div className="l">Donors</div></div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Quick links</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li><a href="/schools">School approval queue →</a></li>
          <li><a href="/donations">Donations list →</a></li>
          <li><a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Open Supabase Dashboard ↗</a></li>
        </ul>
      </div>
    </>
  );
}

function SchoolsQueue() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(null);

  function load() {
    apiGet('/api/admin/schools/pending').then(setItems).catch(() => setItems([]));
  }
  useEffect(load, []);

  async function decide(id, status) {
    setBusy(id);
    try {
      await apiPost('/api/admin/schools/' + id + '/approval', { status });
      load();
    } catch (e) {
      alert(e.message);
    } finally { setBusy(null); }
  }

  return (
    <>
      <h2>Pending schools</h2>
      {items.length === 0 ? (
        <div className="card empty">No schools waiting for review.</div>
      ) : (
        <table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Region</th><th>Owner</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td>{s.type}</td>
                <td>{s.region}</td>
                <td style={{ fontSize: 12, color: 'var(--soft)' }}>{s.owner_user_id?.slice(0, 8)}</td>
                <td style={{ fontSize: 12, color: 'var(--soft)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row">
                    <button className="btn" disabled={busy === s.id} onClick={() => decide(s.id, 'approved')}>Approve</button>
                    <button className="btn danger" disabled={busy === s.id} onClick={() => decide(s.id, 'rejected')}>Reject</button>
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

function DonationsList() {
  const [donationId, setDonationId] = useState('');
  const [status, setStatus] = useState('at_volunteer');
  const [trackingId, setTrackingId] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setOk(null);
    try {
      const updated = await apiPost(`/api/admin/donations/${donationId}/status`, {
        status, courier_tracking_id: trackingId || undefined, note: note || undefined,
      });
      setOk('Updated #' + updated.id + ' → ' + updated.status);
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <h2>Donations · update status</h2>
      <div className="card">
        <p style={{ color: 'var(--soft)', marginBottom: 12 }}>
          Paste a donation ID and update its delivery status.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>Donation ID</label>
          <input className="input" required value={donationId} onChange={(e) => setDonationId(e.target.value)} placeholder="uuid…" />

          <label>New status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">pending</option>
            <option value="at_volunteer">at_volunteer</option>
            <option value="in_transit">in_transit</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>

          <label>Courier tracking ID (optional)</label>
          <input className="input" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />

          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />

          {err && <div className="error">{err}</div>}
          {ok && <div style={{ color: 'green', fontSize: 13 }}>{ok}</div>}

          <button className="btn" style={{ alignSelf: 'flex-start' }}>Update</button>
        </form>
      </div>

      <div className="card" style={{ background: '#fff7ed', borderLeft: '4px solid #f59e0b' }}>
        <strong>TODO:</strong> add a `/api/admin/donations` list endpoint on the server to browse and filter donations here instead of pasting IDs manually.
      </div>
    </>
  );
}
