import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost, apiPut, apiDelete } from '../api.js';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { Loading, ErrorState, EmptyState } from '../components/States.jsx';

const BANNER = 'https://picsum.photos/seed/bb-manage/1200/420';

export default function SchoolManage() {
  const { t, lang } = useT();
  const prefix = '/' + lang;
  const { user, loading: authLoading } = useAuth();
  const [schools, setSchools] = useState(null);
  const [selected, setSelected] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [editingSchool, setEditingSchool] = useState(false);

  async function load() {
    setError(null);
    try {
      // All schools owned by the current user (beneficiary + volunteer, any status).
      const list = await apiGet('/api/schools/mine').catch(() => []);
      setSchools(list);
      if (list.length > 0 && !selected) setSelected(list[0].id);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    if (selected) {
      apiGet('/api/schools/' + selected + '/book-requests').then(setRequests).catch(() => setRequests([]));
    }
    setEditingSchool(false);
  }, [selected]);

  const selectedSchool = schools?.find((s) => s.id === selected) || null;

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
            <div className="page-banner-eyebrow">{t('schoolManage.eyebrow')}</div>
            <h1>{t('schoolManage.title')}</h1>
            <div className="page-banner-meta">{t('schoolManage.subtitle')}</div>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {schools === null && !error && <Loading kind="list" />}

        {schools && schools.length > 0 && (
          <>
            <div className="card" style={{ maxWidth: 'none', margin: '0 0 24px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                {t('schoolManage.pickSchool')}
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <select
                  style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--gray-200)', fontSize: 15, background: 'white' }}
                  value={selected || ''}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditingSchool((v) => !v)}
                >
                  {editingSchool ? t('common.cancel') : t('schoolManage.editSchool')}
                </button>
              </div>
            </div>

            {selectedSchool && editingSchool && (
              <EditSchoolCard
                school={selectedSchool}
                onSaved={() => { setEditingSchool(false); load(); }}
                onCancel={() => setEditingSchool(false)}
                t={t}
              />
            )}

            {selected && !editingSchool && (
              <BookRequestsManager
                schoolId={selected}
                requests={requests}
                reload={() => apiGet('/api/schools/' + selected + '/book-requests').then(setRequests)}
                t={t}
              />
            )}
          </>
        )}

        <CreateSchoolCard onCreated={load} t={t} />
      </div>
    </section>
  );
}

function fieldsFromForm(form, photoUrl) {
  const out = { ...form };
  if (photoUrl) out.photo_url = photoUrl;
  // Convert empty strings to undefined so Zod's `.optional()` doesn't trip on them.
  for (const k of Object.keys(out)) {
    if (out[k] === '' || out[k] === null) delete out[k];
  }
  // Numbers
  if (out.lat !== undefined) out.lat = Number(out.lat);
  if (out.lng !== undefined) out.lng = Number(out.lng);
  return out;
}

function CreateSchoolCard({ onCreated, t }) {
  const [type, setType] = useState('beneficiary');
  const [form, setForm] = useState({ name: '', region: '', city: '', address: '', description: '', contact_email: '', lat: '', lng: '' });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    try {
      const payload = { type, ...fieldsFromForm(form, photoUrl) };
      await apiPost('/api/schools', payload);
      setOk(t('schoolManage.submitOk'));
      setForm({ name: '', region: '', city: '', address: '', description: '', contact_email: '', lat: '', lng: '' });
      setPhotoUrl(null);
      onCreated();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 'none', margin: '24px 0 0' }}>
      <h3 style={{ marginBottom: 16 }}>➕ {t('schoolManage.registerNew')}</h3>
      <SchoolFormBody
        type={type}
        setType={setType}
        form={form}
        set={set}
        photoUrl={photoUrl}
        setPhotoUrl={setPhotoUrl}
        t={t}
      />
      <div style={{ marginTop: 16 }}>
        {err && <div className="error">{err}</div>}
        {ok && <div style={{ background: 'var(--teal-soft)', color: 'var(--teal-dark)', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>✓ {ok}</div>}
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? '…' : t('schoolManage.submitButton')}
        </button>
      </div>
    </div>
  );
}

function EditSchoolCard({ school, onSaved, onCancel, t }) {
  const [form, setForm] = useState({
    name:          school.name || '',
    region:        school.region || '',
    city:          school.city || '',
    address:       school.address || '',
    description:   school.description || '',
    contact_email: school.contact_email || '',
    lat:           school.lat ?? '',
    lng:           school.lng ?? '',
  });
  const [photoUrl, setPhotoUrl] = useState(school.photo_url || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = fieldsFromForm(form, photoUrl !== school.photo_url ? photoUrl : null);
      // Allow clearing fields by sending null instead of undefined
      const out = {};
      for (const k of Object.keys(form)) {
        const v = form[k];
        if (k === 'lat' || k === 'lng') {
          if (v === '') continue;
          out[k] = Number(v);
        } else if (v !== '' && v !== (school[k] || '')) {
          out[k] = v;
        }
      }
      if (photoUrl && photoUrl !== school.photo_url) out.photo_url = photoUrl;
      if (Object.keys(out).length === 0) { onCancel(); return; }
      await apiPut('/api/schools/' + school.id, out);
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ maxWidth: 'none', margin: '0 0 24px' }}>
      <h3 style={{ marginBottom: 16 }}>✏️ {t('schoolManage.editSchoolTitle')}</h3>
      <SchoolFormBody
        type={school.type}
        form={form}
        set={set}
        photoUrl={photoUrl}
        setPhotoUrl={setPhotoUrl}
        t={t}
        hideTypeField
      />
      {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? '…' : t('common.save')}
        </button>
      </div>
    </div>
  );
}

function SchoolFormBody({ type, setType, form, set, photoUrl, setPhotoUrl, t, hideTypeField }) {
  return (
    <div className="form" style={{ maxWidth: 'none' }}>
      {!hideTypeField && (
        <>
          <label>{t('schoolManage.fieldType')}</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="beneficiary">{t('schoolManage.typeBeneficiary')}</option>
            <option value="volunteer">{t('schoolManage.typeVolunteer')}</option>
          </select>
        </>
      )}

      <label>{t('schoolManage.fieldName')}</label>
      <input required value={form.name} onChange={(e) => set('name', e.target.value)} />

      <label>{t('schoolManage.fieldRegion')}</label>
      <input value={form.region} onChange={(e) => set('region', e.target.value)} placeholder={t('schoolManage.regionPlaceholder')} />

      <label>{t('schoolManage.fieldCity')}</label>
      <input value={form.city} onChange={(e) => set('city', e.target.value)} />

      <label>{t('schoolManage.fieldAddress')}</label>
      <input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('schoolManage.fieldLat')}</label>
          <input
            type="number" step="0.000001" min={-90} max={90}
            value={form.lat}
            onChange={(e) => set('lat', e.target.value)}
            placeholder="41.7"
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--gray-200)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('schoolManage.fieldLng')}</label>
          <input
            type="number" step="0.000001" min={-180} max={180}
            value={form.lng}
            onChange={(e) => set('lng', e.target.value)}
            placeholder="44.8"
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--gray-200)' }}
          />
        </div>
      </div>
      <small style={{ color: 'var(--gray-500)', fontSize: 12, marginTop: -8 }}>{t('schoolManage.latLngHint')}</small>

      <label>{t('schoolManage.fieldDescription')}</label>
      <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />

      <label>{t('schoolManage.fieldContactEmail')}</label>
      <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />

      <label>{t('schoolManage.fieldPhoto')}</label>
      <PhotoUpload bucket="school-photos" onUploaded={setPhotoUrl} initialUrl={photoUrl} />
    </div>
  );
}

function BookRequestsManager({ schoolId, requests, reload, t }) {
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
    if (!confirm(t('schoolManage.confirmDelete'))) return;
    try { await apiDelete('/api/schools/' + schoolId + '/book-requests/' + id); reload(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div className="card" style={{ maxWidth: 'none', margin: 0 }}>
      <h3 style={{ marginBottom: 16 }}>📚 {t('schoolManage.bookRequests')}</h3>

      {requests.length === 0 ? (
        <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>{t('schoolManage.noRequests')}</p>
      ) : (
        <div className="row-list" style={{ marginBottom: 24 }}>
          {requests.map((r) => (
            <div className="row-item" key={r.id}>
              <div className="row-item-main">
                <div className="row-item-title">{r.title || r.author || r.genre}</div>
                <div className="row-item-sub">
                  ({r.request_type}) · {r.quantity_fulfilled}/{r.quantity_needed} {t('schoolManage.fulfilled')}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => remove(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <h4 style={{ marginBottom: 12 }}>{t('schoolManage.addRequest')}</h4>
      <form className="form" onSubmit={submit}>
        <label>{t('schoolManage.requestType')}</label>
        <select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>
          <option value="title">{t('schoolManage.byTitle')}</option>
          <option value="author">{t('schoolManage.byAuthor')}</option>
          <option value="genre">{t('schoolManage.byGenre')}</option>
        </select>

        {form.request_type === 'title' && (<>
          <label>{t('schoolManage.fieldTitle')}</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </>)}
        {form.request_type === 'author' && (<>
          <label>{t('schoolManage.fieldAuthor')}</label>
          <input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </>)}
        {form.request_type === 'genre' && (<>
          <label>{t('schoolManage.fieldGenre')}</label>
          <input required value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
        </>)}

        <label>{t('schoolManage.fieldQty')}</label>
        <input type="number" min="1" value={form.quantity_needed} onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })} />

        <label>{t('schoolManage.fieldNotes')}</label>
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        {err && <div className="error">{err}</div>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '…' : t('schoolManage.addRequestButton')}
        </button>
      </form>
    </div>
  );
}
