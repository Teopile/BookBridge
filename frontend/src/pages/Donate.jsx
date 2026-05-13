import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost } from '../api.js';

const SAMPLE_PHOTOS = [
  'https://picsum.photos/seed/bb-school-1/1200/400',
  'https://picsum.photos/seed/bb-school-2/1200/400',
  'https://picsum.photos/seed/bb-school-3/1200/400',
];
const photoFor = (id) => {
  if (!id) return SAMPLE_PHOTOS[0];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SAMPLE_PHOTOS[h % SAMPLE_PHOTOS.length];
};

export default function Donate() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefix = '/' + lang;

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

  const chosenSchoolObj = schools.find((s) => s.id === chosenSchool) || null;

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
      const cleanItems = items.map((i) => {
        const out = { quantity: Number(i.quantity) || 1 };
        if (i.matched_request_id) out.matched_request_id = i.matched_request_id;
        if (i.book_title)         out.book_title = i.book_title;
        if (i.book_author)        out.book_author = i.book_author;
        if (i.book_genre)         out.book_genre = i.book_genre;
        return out;
      });

      const payload = { delivery_method: delivery, items: cleanItems };
      if (chosenSchool)                           payload.beneficiary_school_id = chosenSchool;
      if (delivery === 'self' && chosenVolunteer) payload.volunteer_school_id   = chosenVolunteer;
      if (delivery === 'courier' && donorAddress) payload.donor_address         = donorAddress;

      const created = await apiPost('/api/donations', payload);
      navigate('/' + lang + '/track/' + created.track_token);
    } catch (e) {
      if (e.body?.issues?.length) {
        setError(e.body.issues.map((i) => `${i.path}: ${i.message}`).join(' · '));
      } else {
        setError(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = [
    t('donate.step1'),
    t('donate.step2'),
    t('donate.step3'),
    t('donate.step4'),
  ];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        {/* Soft banner with school photo placeholder */}
        <div style={{
          aspectRatio: '4 / 1',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 24,
          background: 'linear-gradient(135deg, var(--teal-soft), #fff5e6)',
          position: 'relative',
        }}>
          <img
            src={photoFor(chosenSchool)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.5))',
          }} />
          <div style={{
            position: 'absolute', left: 24, bottom: 20, right: 24,
            color: 'white',
          }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {t('donate.stepOf', { current: step, total: 4 })}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {stepLabels[step - 1]}
            </div>
            {chosenSchoolObj && (
              <div style={{ fontSize: 13, marginTop: 4, opacity: 0.92 }}>
                {t('donate.donatingTo')} <strong>{chosenSchoolObj.name}</strong>
                {chosenSchoolObj.region ? ' · ' + chosenSchoolObj.region : ''}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="wizard-progress">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={'wizard-step-pill' + (step >= n ? ' done' : '')} />
          ))}
        </div>

        <div className="card" style={{ maxWidth: 'none', margin: 0 }}>
          {step === 1 && (
            <>
              <h2 style={{ marginBottom: 12 }}>{t('donate.step1')}</h2>
              <p style={{ color: 'var(--gray-700)', marginBottom: 16 }}>{t('donate.step1Help')}</p>

              {schools.length === 0 ? (
                <div style={{ padding: 20, background: 'var(--bg-subtle, var(--gray-100))', borderRadius: 10, borderLeft: '3px solid var(--teal)' }}>
                  <p style={{ marginBottom: 12, color: 'var(--gray-700)' }}>{t('donate.noSchoolsYet')}</p>
                  <a href={prefix + '/school/manage'} className="btn btn-primary btn-sm">
                    {t('donate.registerSchool')} →
                  </a>
                </div>
              ) : (
                <>
                  <select
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--gray-200)', fontSize: 15, background: 'white' }}
                    value={chosenSchool || ''} onChange={(e) => setChosenSchool(e.target.value || null)}
                  >
                    <option value="">— {t('donate.pickSchool')} —</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name} {s.region ? '· ' + s.region : ''}</option>)}
                  </select>
                  <div style={{ marginTop: 24 }}>
                    <button className="btn btn-primary" disabled={!chosenSchool} onClick={() => setStep(2)}>
                      {t('donate.next')}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ marginBottom: 16 }}>{t('donate.step2')}</h2>
              {bookRequests.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ marginBottom: 12 }}>{t('donate.requestedBySchool')}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bookRequests.map((r) => {
                      const checked = !!items.find((i) => i.matched_request_id === r.id);
                      return (
                        <label key={r.id} style={{
                          background: checked ? 'var(--teal-soft)' : 'var(--gray-100)',
                          border: '1.5px solid ' + (checked ? 'var(--teal)' : 'transparent'),
                          padding: 12, borderRadius: 10,
                          display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(r)} />
                          <span>
                            <strong>{r.title || r.author || r.genre}</strong>
                            <small style={{ color: 'var(--gray-500)', marginLeft: 8 }}>
                              ({r.request_type}, {t('donate.need')} {r.quantity_needed})
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <h4 style={{ marginBottom: 12 }}>{t('donate.customBooks')}</h4>
              {items.filter((i) => !i.matched_request_id).map((it) => {
                const realIdx = items.indexOf(it);
                return (
                  <div key={realIdx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder={t('donate.titlePlaceholder')} value={it.book_title || ''} onChange={(e) => updateItem(realIdx, 'book_title', e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 10, border: '1.5px solid var(--gray-200)' }} />
                    <input placeholder={t('donate.authorPlaceholder')} value={it.book_author || ''} onChange={(e) => updateItem(realIdx, 'book_author', e.target.value)} style={{ flex: 2, padding: 10, borderRadius: 10, border: '1.5px solid var(--gray-200)' }} />
                    <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(realIdx, 'quantity', e.target.value)} style={{ width: 70, padding: 10, borderRadius: 10, border: '1.5px solid var(--gray-200)' }} />
                    <button onClick={() => removeItem(realIdx)} className="btn btn-secondary btn-sm">✕</button>
                  </div>
                );
              })}
              <button onClick={addCustom} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                + {t('donate.addCustomBook')}
              </button>
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>{t('donate.back')}</button>
                <button className="btn btn-primary" disabled={items.length === 0} onClick={() => setStep(3)}>
                  {t('donate.next')}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 16 }}>{t('donate.step3')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{
                  padding: 16, borderRadius: 10,
                  border: '1.5px solid ' + (delivery === 'self' ? 'var(--teal)' : 'var(--gray-200)'),
                  background: delivery === 'self' ? 'var(--teal-soft)' : 'white',
                  cursor: 'pointer',
                }}>
                  <input type="radio" name="delivery" checked={delivery === 'self'} onChange={() => setDelivery('self')} style={{ marginRight: 12 }} />
                  <strong>{t('donate.methodSelf')}</strong>
                  <p style={{ color: 'var(--gray-700)', marginLeft: 32, marginTop: 4, fontSize: 14 }}>{t('donate.methodSelfDesc')}</p>
                </label>
                <label style={{
                  padding: 16, borderRadius: 10,
                  border: '1.5px solid ' + (delivery === 'courier' ? 'var(--teal)' : 'var(--gray-200)'),
                  background: delivery === 'courier' ? 'var(--teal-soft)' : 'white',
                  cursor: 'pointer',
                }}>
                  <input type="radio" name="delivery" checked={delivery === 'courier'} onChange={() => setDelivery('courier')} style={{ marginRight: 12 }} />
                  <strong>{t('donate.methodCourier')}</strong>
                  <p style={{ color: 'var(--gray-700)', marginLeft: 32, marginTop: 4, fontSize: 14 }}>{t('donate.methodCourierDesc')}</p>
                </label>
              </div>

              {delivery === 'self' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>{t('donate.pickVolunteer')}</label>
                  <select value={chosenVolunteer || ''} onChange={(e) => setChosenVolunteer(e.target.value || null)}
                    style={{ display: 'block', width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--gray-200)', marginTop: 6 }}>
                    <option value="">— {t('donate.pickOne')} —</option>
                    {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name} {v.address ? '· ' + v.address : ''}</option>)}
                  </select>
                </div>
              )}

              {delivery === 'courier' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>{t('donate.pickupAddress')}</label>
                  <input value={donorAddress} onChange={(e) => setDonorAddress(e.target.value)}
                    style={{ display: 'block', width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--gray-200)', marginTop: 6 }} />
                </div>
              )}

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>{t('donate.back')}</button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>{t('donate.next')}</button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={{ marginBottom: 16 }}>{t('donate.step4')}</h2>
              <ul style={{ listStyle: 'none', padding: 0, lineHeight: 1.8, color: 'var(--gray-700)' }}>
                <li><strong>{t('donate.summarySchool')}:</strong> {chosenSchoolObj?.name || '—'}</li>
                <li><strong>{t('donate.summaryItems')}:</strong> {items.length}</li>
                <li><strong>{t('donate.summaryDelivery')}:</strong> {delivery === 'self' ? t('donate.methodSelf') : t('donate.methodCourier')}</li>
              </ul>
              {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep(3)}>{t('donate.back')}</button>
                <button className="btn btn-primary" disabled={submitting} onClick={submit}>
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
