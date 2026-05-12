import { useState } from 'react';
import { useT } from '../i18n/I18nContext.jsx';
import { apiPost } from '../api.js';

export default function DonateMoney() {
  const { t } = useT();
  const [amount, setAmount] = useState(50);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await apiPost('/api/payments/monetary', {
        amount_minor: Math.round(Number(amount) * 100),
        currency: 'GEL',
        donor_email_for_receipt: email || undefined,
        donor_name_for_receipt: name || undefined,
      });
      if (res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        setResult(res);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="card">
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, marginBottom: 8 }}>💝 Donate money</h1>
        <p style={{ color: 'var(--soft-gray)', marginBottom: 24 }}>
          A monetary donation helps us cover shipping, courier fees, and school outreach.
        </p>

        {result ? (
          <div style={{ background: 'rgba(45,139,122,0.1)', padding: 24, borderRadius: 12 }}>
            <h3>✅ Thank you!</h3>
            <p style={{ color: 'var(--soft-gray)', marginTop: 8 }}>
              Donation #{result.donation_id} · status: {result.status}
            </p>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <label>Amount (GEL)</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />

            <label>Email for receipt (optional)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label>Name on receipt (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />

            {err && <div className="error">{err}</div>}

            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? '…' : '💳 Continue to payment'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
