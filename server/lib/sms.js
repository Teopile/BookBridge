// SMS wrapper: Twilio or Verify.ge — picked by SMS_PROVIDER env var.

export async function sendSms({ to, body } = {}) {
  const provider = (process.env.SMS_PROVIDER || 'disabled').toLowerCase();
  if (provider === 'disabled') {
    console.warn('[sms] SMS_PROVIDER=disabled — skipping SMS to', to);
    return { skipped: true };
  }
  if (provider === 'twilio') return sendTwilio({ to, body });
  if (provider === 'verify_ge') return sendVerifyGe({ to, body });
  throw new Error(`Unknown SMS_PROVIDER=${provider}`);
}

async function sendTwilio({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error('Twilio env vars missing');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const formBody = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sendVerifyGe({ to, body }) {
  const key = process.env.VERIFY_GE_API_KEY;
  if (!key) throw new Error('VERIFY_GE_API_KEY missing');
  const res = await fetch('https://verify.ge/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ to, text: body }),
  });
  if (!res.ok) throw new Error(`Verify.ge error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const SmsTemplates = {
  delivered({ schoolName, lang = 'en' }) {
    return lang === 'ka'
      ? `BookBridge: შენი წიგნი მიტანილია სკოლა "${schoolName}"-ში`
      : `BookBridge: your book has arrived at "${schoolName}"`;
  },
  statusChange({ donationId, status, lang = 'en' }) {
    return lang === 'ka'
      ? `BookBridge: დონაცია #${donationId} — ${status}`
      : `BookBridge: donation #${donationId} — ${status}`;
  },
};
