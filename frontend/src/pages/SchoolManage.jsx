import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost, apiDelete } from '../api.js';
import PhotoUpload from '../components/PhotoUpload.jsx';

export default function SchoolManage() {
  const { t, lang } = useT();
  const { user, loading } = useAuth();
  const [schools, setSchools] = useState([]);
  const [selected, setSelected] = useState(null);
  const [requests, setRequests] = useState([]);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      // /api/volunteer/my-schools returns *volunteer* schools owned by the user.
      // Beneficiary schools owned by the user are visible via RLS on /api/schools (their `owner_user_id = auth.uid()` policy).
      const volunteer = await apiGet('/api/volunteer/my-schools').catch(() => []);
      // Fallback: get all approved + the user's own (server-side admin path is not needed; RLS lets owner see own pending).
      // Since the public list endpoint only returns 'approved' schools, here we just trust the volunteer list,
      // and for beneficiary management owners need at least one beneficiary school created which then appears
      // once approved. This is a known limitation; full owner-list endpoint can be added on the server later.
      setSchools(volunteer);
      if (volunteer.length > 0 && !selected) setSelected(volunteer[0].id);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    if (selected) {
      apiGet('/api/schools/' + selected + '/book-requests').then(setRequests).catch(() => setRequests([]));
    }
  }, [selected]);

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
          🏔️ School management
        </h1>

        {schools.length > 0 && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Pick a school you own</label>
              <select style={{ marginTop: 8, padding: 12, borderRadius: 12, border: '2px solid var(--mist)', width: '100%' }}
                value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
              </select>
            </div>

            {selected && <BookRequestsManager schoolId={selected} requests={requests} reload={() => apiGet('/api/schools/' + selected + '/book-requests').then(setRequests)} />}
          </>
        )}

        <CreateSchoolCard onCreated={() => load()} />

        {err && <div className="card error">{err}</div>}
      </div>
    </section>
  );
}

function CreateSchoolCard({ onCreated }) {
  const [type, setType] = useState('beneficiary');
  const [form, setForm] = useState({ name: '', region: '', city: '', description: '', contact_phone: '', contact_email: '' });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      await apiPost('/api/schools', { type, photo_url: photoUrl || undefined, ...form });
      setOk('Submitted for approval. An admin will review.');
      setForm({ name: '', region: '', city: '', description: '', contact_phone: '', contact_email: '' });
      setPhotoUrl(null);
      onCreated();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 16 }}>➕ Register a new school</h3>
      <form className="form" onSubmit={submit} style={{ maxWidth: 'none' }}>
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="beneficiary">Beneficiary (highland school)</option>
          <option value="volunteer">Volunteer (Tbilisi intermediate)</option>
        </select>

        <label>Name</label>
        <input required value={form.name} onChange={(e) => set('name', e.target.value)} />

        <label>Region</label>
        <input value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="e.g. Samtskhe-Javakheti" />

        <label>City</label>
        <input value={form.city} onChange={(e) => set('city', e.target.value)} />

        <label>Description</label>
        <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />

        <label>Contact phone</label>
        <input value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />

        <label>Contact email</label>
        <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />

        <label>Photo</label>
        <PhotoUpload bucket="school-photos" onUploaded={setPhotoUrl} />

        {err && <div className="error">{err}</div>}
        {ok && <div style={{ color: 'green', fontSize: 13 }}>{ok}</div>}
        <button className="btn-primary" disabled={busy}>{busy ? '…' : 'Submit for approval'}</button>
      </form>
    </div>
  );
}

function BookRequestsManager({ schoolId, requests, reload }) {
  const [form, setForm] = useState({ request_type: 'title', title: '', author: '', genre: '', quantity_needed: 1, notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/schools/' + schoolId + '/book-requests', {
        request_type: form.request_type,
        title: form.title || undefined,
        author: form.author || undefined,
        genre: form.genre || undefined,
        quantity_needed: Number(form.quantity_needed) || 1,
        notes: form.notes || undefined,
      });
      setForm({ request_type: 'title', title: '', author: '', genre: '', quantity_needed: 1, notes: '' });
      reload();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this request?')) return;
    try { await apiDelete('/api/schools/' + schoolId + '/book-requests/' + id); reload(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 16 }}>📚 Book requests</h3>

      {requests.length === 0 && <p style={{ color: 'var(--soft-gray)' }}>No requests yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {requests.map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--mist)', padding: 12, borderRadius: 10 }}>
            <div>
              <strong>{r.title || r.author || r.genre}</strong>
              <span style={{ color: 'var(--soft-gray)', marginLeft: 8, fontSize: 13 }}>({r.request_type})</span>
              <div style={{ fontSize: 12, color: 'var(--soft-gray)' }}>
                {r.quantity_fulfilled}/{r.quantity_needed} fulfilled
              </div>
            </div>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remove(r.id)}>✕</button>
          </div>
        ))}
      </div>

      <h4 style={{ marginBottom: 12 }}>Add a request</h4>
      <form className="form" onSubmit={submit} style={{ maxWidth: 'none' }}>
        <label>Type</label>
        <select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>
          <option value="title">Specific title</option>
          <option value="author">By author</option>
          <option value="genre">By genre</option>
        </select>

        {form.request_type === 'title' && (<>
          <label>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </>)}
        {form.request_type === 'author' && (<>
          <label>Author</label>
          <input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </>)}
        {form.request_type === 'genre' && (<>
          <label>Genre</label>
          <input required value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
        </>)}

        <label>Quantity needed</label>
        <input type="number" min="1" value={form.quantity_needed} onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })} />

        <label>Notes (optional)</label>
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        {err && <div className="error">{err}</div>}
        <button className="btn-primary" disabled={busy}>{busy ? '…' : 'Add request'}</button>
      </form>
    </div>
  );
}
