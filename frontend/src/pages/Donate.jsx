import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost } from '../api.js';

export default function Donate() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState(1);
  const [schools, setSchools] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [chosenSchool, setChosenSchool] = useState(params.get('school') || null);
  const [bookRequests, setBookRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [delivery, setDelivery] = useState('self');
  const [chosenVolunteer, setChosenVolunteer] = useState(null);
  const [donorAddress, setDonorAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/schools?type=beneficiary').then(setSchools).catch(() => {});
    apiGet('/api/schools?type=volunteer').then(setVolunteers).catch(() => {});
  }, []);

  useEffect(() => {
    if (chosenSchool) {
      apiGet('/api/schools/' + chosenSchool + '/book-requests').then(setBookRequests).catch(() => setBookRequests([]));
    }
  }, [chosenSchool]);

  function toggleItem(req) {
    setItems((curr) => {
      const exists = curr.find((i) => i.matched_request_id === req.id);
      if (exists) return curr.filter((i) => i.matched_request_id !== req.id);
      return [...curr, {
        matched_request_id: req.id,
        book_title: req.title || undefined,
        book_author: req.author || undefined,
        book_genre: req.genre || undefined,
        quantity: 1,
      }];
    });
  }
  function addCustom() { setItems((curr) => [...curr, { book_title: '', book_author: '', quantity: 1 }]); }
  function updateItem(idx, k, v) { setItems((curr) => curr.map((it, i) => (i === idx ? { ...it, [k]: v } : it))); }
  function removeItem(idx) { setItems((curr) => curr.filter((_, i) => i !== idx)); }

  async function submit() {
    if (!user) { navigate('/' + lang + '/auth?next=/donate'); return; }
    setSubmitting(true); setError(null);
    try {
      const payload = {
        beneficiary_school_id: chosenSchool || undefined,
        volunteer_school_id: delivery === 'self' ? chosenVolunteer : undefined,
        delivery_method: delivery,
        donor_address: delivery === 'courier' ? donorAddress : undefined,
        items: items.map((i) => ({ ...i, quantity: Number(i.quantity) || 1 })),
      };
      const created = await apiPost('/api/donations', payload);
      navigate('/' + lang + '/track/' + created.track_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="section-inner">
        <div className="wizard-steps">
          {[t('donate.step1'), t('donate.step2'), t('donate.step3'), t('donate.step4')].map((label, i) => (
            <div key={i} className={'wizard-step' + (step === i + 1 ? ' active' : step > i + 1 ? ' done' : '')}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 800 }}>
          {step === 1 && (
            <>
              <h2 style={{ marginBottom: 16, fontFamily: 'Cormorant Garamond, serif' }}>{t('donate.step1')}</h2>
              <select style={{ width: '100%', padding: 12, borderRadius: 12, border: '2px solid var(--mist)', fontSize: 15 }}
                value={chosenSchool || ''} onChange={(e) => setChosenSchool(e.target.value || null)}>
                <option value="">— {t('donate.step1')} —</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.region}</option>)}
              </select>
              <div style={{ marginTop: 24 }}>
                <button className="btn-primary" onClick={() => setStep(2)}>Next →</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ marginBottom: 16, fontFamily: 'Cormorant Garamond, serif' }}>{t('donate.step2')}</h2>
              {bookRequests.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ marginBottom: 12 }}>Requested by this school:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bookRequests.map((r) => {
                      const checked = !!items.find((i) => i.matched_request_id === r.id);
                      return (
                        <label key={r.id} style={{ background: checked ? 'rgba(45,139,122,0.1)' : 'var(--mist)', padding: 12, borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(r)} />
                          <span><strong>{r.title || r.author || r.genre}</strong> <small style={{ color: 'var(--soft-gray)' }}>({r.request_type}, need {r.quantity_needed})</small></span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <h4 style={{ marginBottom: 12 }}>Custom items:</h4>
              {items.filter((i) => !i.matched_request_id).map((it) => {
                const realIdx = items.indexOf(it);
                return (
                  <div key={realIdx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder="Title" value={it.book_title || ''} onChange={(e) => updateItem(realIdx, 'book_title', e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 10, border: '2px solid var(--mist)' }} />
                    <input placeholder="Author" value={it.book_author || ''} onChange={(e) => updateItem(realIdx, 'book_author', e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 10, border: '2px solid var(--mist)' }} />
                    <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(realIdx, 'quantity', e.target.value)} style={{ width: 70, padding: 10, borderRadius: 10, border: '2px solid var(--mist)' }} />
                    <button onClick={() => removeItem(realIdx)} className="btn-secondary" style={{ padding: '6px 12px' }}>✕</button>
                  </div>
                );
              })}
              <button onClick={addCustom} className="btn-secondary" style={{ marginTop: 8 }}>+ Add a custom book</button>
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" disabled={items.length === 0} onClick={() => setStep(3)}>Next →</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 16, fontFamily: 'Cormorant Garamond, serif' }}>{t('donate.step3')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ padding: 16, borderRadius: 12, border: '2px solid ' + (delivery === 'self' ? 'var(--primary)' : 'var(--mist)'), background: delivery === 'self' ? 'rgba(45,139,122,0.08)' : 'white', cursor: 'pointer' }}>
                  <input type="radio" name="delivery" checked={delivery === 'self'} onChange={() => setDelivery('self')} style={{ marginRight: 12 }} />
                  <strong>{t('donate.methodSelf')}</strong>
                  <p style={{ color: 'var(--soft-gray)', marginLeft: 32, marginTop: 4 }}>{t('donate.methodSelfDesc')}</p>
                </label>
                <label style={{ padding: 16, borderRadius: 12, border: '2px solid ' + (delivery === 'courier' ? 'var(--primary)' : 'var(--mist)'), background: delivery === 'courier' ? 'rgba(45,139,122,0.08)' : 'white', cursor: 'pointer' }}>
                  <input type="radio" name="delivery" checked={delivery === 'courier'} onChange={() => setDelivery('courier')} style={{ marginRight: 12 }} />
                  <strong>{t('donate.methodCourier')}</strong>
                  <p style={{ color: 'var(--soft-gray)', marginLeft: 32, marginTop: 4 }}>{t('donate.methodCourierDesc')}</p>
                </label>
              </div>

              {delivery === 'self' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Volunteer school</label>
                  <select value={chosenVolunteer || ''} onChange={(e) => setChosenVolunteer(e.target.value || null)} style={{ display: 'block', width: '100%', padding: 12, borderRadius: 12, border: '2px solid var(--mist)', marginTop: 6 }}>
                    <option value="">— pick one —</option>
                    {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.address}</option>)}
                  </select>
                </div>
              )}

              {delivery === 'courier' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Pickup address</label>
                  <input value={donorAddress} onChange={(e) => setDonorAddress(e.target.value)} style={{ display: 'block', width: '100%', padding: 12, borderRadius: 12, border: '2px solid var(--mist)', marginTop: 6 }} />
                </div>
              )}

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(4)}>Next →</button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={{ marginBottom: 16, fontFamily: 'Cormorant Garamond, serif' }}>{t('donate.step4')}</h2>
              <p><strong>School:</strong> {schools.find((s) => s.id === chosenSchool)?.name || '— auto-pick —'}</p>
              <p style={{ marginTop: 8 }}><strong>Items:</strong> {items.length}</p>
              <p style={{ marginTop: 8 }}><strong>Delivery:</strong> {delivery === 'self' ? t('donate.methodSelf') : t('donate.methodCourier')}</p>
              {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button className="btn-primary" disabled={submitting} onClick={submit}>
                  {submitting ? '…' : t('donate.confirm')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
