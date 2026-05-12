// Maileroo HTTPS API wrapper.
// DigitalOcean blocks outbound SMTP ports, so we use the REST API, not SMTP.

const ENDPOINT = 'https://smtp.maileroo.com/send';

export async function sendEmail({ to, subject, html, text, replyTo } = {}) {
  const apiKey = process.env.MAILEROO_API_KEY;
  const from = process.env.MAILEROO_FROM || 'noreply@example.com';
  const fromName = process.env.MAILEROO_FROM_NAME || 'BookBridge';

  if (!apiKey) {
    console.warn('[mailer] MAILEROO_API_KEY not set — skipping email to', to);
    return { skipped: true };
  }

  const body = new URLSearchParams();
  body.set('from', `${fromName} <${from}>`);
  body.set('to', to);
  body.set('subject', subject);
  if (html) body.set('html', html);
  if (text) body.set('plain', text);
  if (replyTo) body.set('reply_to', replyTo);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Maileroo error ${res.status}: ${errText}`);
  }
  return res.json().catch(() => ({}));
}

export const Templates = {
  registration({ fullName, lang = 'en' }) {
    const t = lang === 'ka'
      ? { subject: 'BookBridge — გილოცავთ რეგისტრაციას!', greeting: `მოგესალმებით${fullName ? ', ' + fullName : ''}!`, body: 'თქვენი BookBridge-ის ანგარიში წარმატებით შეიქმნა.' }
      : { subject: 'Welcome to BookBridge', greeting: `Hello${fullName ? ', ' + fullName : ''}!`, body: 'Your BookBridge account is ready.' };
    return { subject: t.subject, html: `<p>${t.greeting}</p><p>${t.body}</p>` };
  },
  donationConfirmed({ donationId, trackUrl, lang = 'en' }) {
    const t = lang === 'ka'
      ? { subject: 'შენი დონაცია მიღებულია', body: `მადლობა! მიღებულია დონაცია #${donationId}.` }
      : { subject: 'Your donation is received', body: `Thank you! We received donation #${donationId}.` };
    return { subject: t.subject, html: `<p>${t.body}</p><p><a href="${trackUrl}">${trackUrl}</a></p>` };
  },
  statusChanged({ donationId, status, trackUrl, lang = 'en' }) {
    const t = lang === 'ka'
      ? { subject: `დონაცია #${donationId}: ${status}`, body: 'შენი დონაციის სტატუსი განახლდა.' }
      : { subject: `Donation #${donationId}: ${status}`, body: 'Your donation has a new status.' };
    return { subject: t.subject, html: `<p>${t.body}</p><p><a href="${trackUrl}">${trackUrl}</a></p>` };
  },
  donationDelivered({ donationId, schoolName, trackUrl, lang = 'en' }) {
    const t = lang === 'ka'
      ? { subject: 'შენი წიგნი მიტანილია მთაში!', body: `დონაცია მიტანილია — ${schoolName}.` }
      : { subject: 'Your book has arrived in the mountains', body: `Delivered to ${schoolName}.` };
    return { subject: t.subject, html: `<p>${t.body}</p><p><a href="${trackUrl}">${trackUrl}</a></p>` };
  },
  monetaryReceipt({ amountMinor, currency, lang = 'en' }) {
    const amount = (amountMinor / 100).toFixed(2);
    const t = lang === 'ka'
      ? { subject: 'მადლობა შემოწირულობისთვის', body: `მიღებულია: ${amount} ${currency}.` }
      : { subject: 'Thank you for your donation', body: `Received: ${amount} ${currency}.` };
    return { subject: t.subject, html: `<p>${t.body}</p>` };
  },
};
