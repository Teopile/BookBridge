import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiGet, apiPost } from '../api.js';

const SAMPLE_PHOTOS = [
  'https://picsum.photos/seed/bb-school-1/900/225',
  'https://picsum.photos/seed/bb-school-2/900/225',
  'https://picsum.photos/seed/bb-school-3/900/225',
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
      const cleanItems = items
        // Drop blank custom rows (no matched request and no title/author/genre).
        .filter((i) => i.matched_request_id || i.book_title?.trim() || i.book_author?.trim() || i.book_genre?.trim())
        .map((i) => {
          const out = { quantity: Number(i.quantity) || 1 };
          if (i.matched_request_id)    out.matched_request_id = i.matched_request_id;
          if (i.book_title?.trim())    out.book_title = i.book_title.trim();
          if (i.book_author?.trim())   out.book_author = i.book_author.trim();
          if (i.book_genre?.trim())    out.book_genre = i.book_genre.trim();
          return out;
        });

      if (cleanItems.length === 0) {
        setError(t('donate.needAtLeastOneBook'));
        return; // `finally` resets the submitting flag.
      }

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
      <div className="container container-narrow">
        {/* Soft banner with school photo */}
        <div className="wizard-banner">
          <img src={photoFor(chosenSchool)} alt="" width={900} height={225} loading="lazy" decoding="async" />
          <div className="wizard-banner-overlay" />
          <div className="wizard-banner-content">
            <div className="wizard-step-label">
              {t('donate.stepOf', { current: step, total: 4 })}
            </div>
            <div className="wizard-step-heading">
              {stepLabels[step - 1]}
            </div>
            {chosenSchoolObj && (
              <div className="wizard-school-meta">
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
              <h2 style={{ marginBottom: 'var(--space-3)' }}>{t('donate.step1')}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>{t('donate.step1Help')}</p>

              {schools.length === 0 ? (
                <div style={{
                  padding: 'var(--space-5)',
                  background: 'var(--cream-card)',
                  borderRadius: 'var(--r-sm)',
                  borderLeft: '3px solid var(--forest-600)',
                }}>
                  <p style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>{t('donate.noSchoolsYet')}</p>
                  <a href={prefix + '/school/manage'} className="btn btn-primary btn-sm">
                    {t('donate.registerSchool')} →
                  </a>
                </div>
              ) : (
                <>
                  <select
                    className="wizard-select"
                    style={{
                      width: '100%',
                      minHeight: 'var(--tap-min)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--border-strong)',
                      fontSize: 'var(--fs-base)',
                      background: 'var(--surface)',
                      color: 'var(--text-default)',
                    }}
                    value={chosenSchool || ''} onChange={(e) => setChosenSchool(e.target.value || null)}
                  >
                    <option value="">— {t('donate.pickSchool')} —</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name} {s.region ? '· ' + s.region : ''}</option>)}
                  </select>
                  <div style={{ marginTop: 'var(--space-6)' }}>
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
              <h2 style={{ marginBottom: 'var(--space-4)' }}>{t('donate.step2')}</h2>
              {bookRequests.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <h4 style={{ marginBottom: 'var(--space-3)' }}>{t('donate.requestedBySchool')}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {bookRequests.map((r) => {
                      const checked = !!items.find((i) => i.matched_request_id === r.id);
                      return (
                        <label
                          key={r.id}
                          className={'book-request-option' + (checked ? ' checked' : '')}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(r)} />
                          <span>
                            <strong>{r.title || r.author || r.genre}</strong>
                            <small className="book-request-meta">
                              ({r.request_type}, {t('donate.need')} {r.quantity_needed})
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <h4 style={{ marginBottom: 'var(--space-3)' }}>{t('donate.customBooks')}</h4>
              {items.filter((i) => !i.matched_request_id).map((it) => {
                const realIdx = items.indexOf(it);
                return (
                  <div key={realIdx} className="custom-book-row">
                    <input
                      placeholder={t('donate.titlePlaceholder')}
                      value={it.book_title || ''}
                      onChange={(e) => updateItem(realIdx, 'book_title', e.target.value)}
                    />
                    <input
                      placeholder={t('donate.authorPlaceholder')}
                      value={it.book_author || ''}
                      onChange={(e) => updateItem(realIdx, 'book_author', e.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      className="qty"
                      value={it.quantity}
                      onChange={(e) => updateItem(realIdx, 'quantity', e.target.value)}
                    />
                    <button
                      onClick={() => removeItem(realIdx)}
                      className="btn btn-ghost btn-sm"
                      aria-label={t('donate.removeBook')}
                      title={t('donate.removeBook')}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button onClick={addCustom} className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-2)' }}>
                + {t('donate.addCustomBook')}
              </button>
              <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>{t('donate.back')}</button>
                <button className="btn btn-primary" disabled={items.length === 0} onClick={() => setStep(3)}>
                  {t('donate.next')}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ marginBottom: 'var(--space-4)' }}>{t('donate.step3')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <label className={'delivery-option' + (delivery === 'self' ? ' selected' : '')}>
                  <input type="radio" name="delivery" checked={delivery === 'self'} onChange={() => setDelivery('self')} />
                  <strong>{t('donate.methodSelf')}</strong>
                  <p className="delivery-option-desc">{t('donate.methodSelfDesc')}</p>
                </label>
                <label className={'delivery-option' + (delivery === 'courier' ? ' selected' : '')}>
                  <input type="radio" name="delivery" checked={delivery === 'courier'} onChange={() => setDelivery('courier')} />
                  <strong>{t('donate.methodCourier')}</strong>
                  <p className="delivery-option-desc">{t('donate.methodCourierDesc')}</p>
                </label>
              </div>

              {delivery === 'self' && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{t('donate.pickVolunteer')}</label>
                  <select
                    value={chosenVolunteer || ''}
                    onChange={(e) => setChosenVolunteer(e.target.value || null)}
                    style={{
                      display: 'block',
                      width: '100%',
                      minHeight: 'var(--tap-min)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--border-strong)',
                      marginTop: 'var(--space-2)',
                      background: 'var(--surface)',
                      color: 'var(--text-default)',
                    }}
                  >
                    <option value="">— {t('donate.pickOne')} —</option>
                    {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name} {v.address ? '· ' + v.address : ''}</option>)}
                  </select>
                </div>
              )}

              {delivery === 'courier' && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{t('donate.pickupAddress')}</label>
                  <input
                    value={donorAddress}
                    onChange={(e) => setDonorAddress(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      minHeight: 'var(--tap-min)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--border-strong)',
                      marginTop: 'var(--space-2)',
                      background: 'var(--surface)',
                      color: 'var(--text-default)',
                    }}
                  />
                </div>
              )}

              <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}>{t('donate.back')}</button>
                <button
                  className="btn btn-primary"
                  disabled={delivery === 'courier' && !donorAddress.trim()}
                  onClick={() => setStep(4)}
                >
                  {t('donate.next')}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={{ marginBottom: 'var(--space-4)' }}>{t('donate.step4')}</h2>
              <ul style={{ listStyle: 'none', padding: 0, lineHeight: 'var(--lh-relaxed)', color: 'var(--text-muted)' }}>
                <li><strong>{t('donate.summarySchool')}:</strong> {chosenSchoolObj?.name || '—'}</li>
                <li><strong>{t('donate.summaryItems')}:</strong> {items.length}</li>
                <li><strong>{t('donate.summaryDelivery')}:</strong> {delivery === 'self' ? t('donate.methodSelf') : t('donate.methodCourier')}</li>
              </ul>
              {error && <div className="error" style={{ marginTop: 'var(--space-4)' }}>{error}</div>}
              <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-ghost" onClick={() => setStep(3)}>{t('donate.back')}</button>
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
