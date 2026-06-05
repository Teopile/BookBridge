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

// -------------------------------------------------------------------------
// Branded email shell.
// Inline styles only — Gmail strips <style> blocks, Outlook ignores most CSS.
// Width 600px is the cross-client safe maximum.
// -------------------------------------------------------------------------

const BRAND = {
  name: 'BookBridge',
  url: process.env.PUBLIC_FRONTEND_ORIGIN || 'http://localhost:5173',
  contactEmail: 'info@bookbridge.ge',
  teal: '#2D8B7A',
  tealDark: '#1A6B5E',
  tealSoft: '#E6F5F2',
  ink: '#1C2B27',
  gray: '#4A5A55',
  grayLight: '#7A8783',
  bg: '#FAF7F2',
  surface: '#FFFFFF',
};

const FOOTER_COPY = {
  en: {
    tagline: 'Your book is awaited in the mountains.',
    sentTo: 'You received this email because you have a BookBridge account or made a donation.',
    visit: 'Visit BookBridge',
    contact: 'Questions? Reply to this email or write to',
  },
  ka: {
    tagline: 'შენს წიგნს ელიან მთაში.',
    sentTo: 'მიიღე ეს წერილი იმიტომ რომ BookBridge-ის ანგარიში გაქვს ან დონაცია გააკეთე.',
    visit: 'BookBridge-ის ვებგვერდი',
    contact: 'კითხვები? უპასუხე ამ წერილს ან მოგვწერე',
  },
};

function shell({ lang = 'en', preheader, heading, intro, body, ctaLabel, ctaUrl, secondary }) {
  const f = FOOTER_COPY[lang] || FOOTER_COPY.en;

  const ctaBlock = ctaLabel && ctaUrl
    ? `
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:${BRAND.teal};color:#fff;text-decoration:none;
                    padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ${escape(ctaLabel)}
          </a>
        </td>
      </tr>`
    : '';

  const secondaryBlock = secondary
    ? `<tr><td style="padding:0 32px 24px;font-size:14px;color:${BRAND.grayLight};line-height:1.6;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${secondary}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans Georgian',Roboto,Arial,sans-serif;
             color:${BRAND.ink};-webkit-font-smoothing:antialiased;">
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;
               overflow:hidden;font-size:1px;line-height:1px;mso-hide:all;">${escape(preheader || intro || '')}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         style="background:${BRAND.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="max-width:600px;width:100%;background:${BRAND.surface};border-radius:14px;
                      border:1px solid #E0E8E6;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.tealSoft};padding:24px 32px;border-bottom:1px solid #C8E4DF;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:700;color:${BRAND.tealDark};
                                 letter-spacing:-0.01em;">${BRAND.name}</span>
                  </td>
                  <td align="right" style="font-size:13px;color:${BRAND.gray};">
                    ${escape(f.tagline)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${BRAND.ink};
                         font-weight:600;letter-spacing:-0.01em;">${escape(heading)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray};">
                ${intro}
              </p>
              ${body || ''}
            </td>
          </tr>
          ${ctaBlock}
          ${secondaryBlock}
          <tr>
            <td style="padding:24px 32px;background:#FAFAF7;border-top:1px solid #E0E8E6;
                       font-size:12px;line-height:1.6;color:${BRAND.grayLight};">
              <p style="margin:0 0 6px;">${escape(f.sentTo)}</p>
              <p style="margin:0;">
                ${escape(f.contact)} <a href="mailto:${BRAND.contactEmail}"
                   style="color:${BRAND.teal};text-decoration:none;">${BRAND.contactEmail}</a>
                · <a href="${BRAND.url}" style="color:${BRAND.teal};text-decoration:none;">${escape(f.visit)}</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${BRAND.grayLight};">
          © ${new Date().getFullYear()} ${BRAND.name}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function textShell({ lang = 'en', heading, intro, body, ctaLabel, ctaUrl, secondary }) {
  const f = FOOTER_COPY[lang] || FOOTER_COPY.en;
  const lines = [
    BRAND.name + ' — ' + f.tagline,
    ''.padEnd(50, '-'),
    '',
    heading,
    '',
    intro,
    '',
  ];
  if (body) lines.push(body, '');
  if (ctaLabel && ctaUrl) lines.push(ctaLabel + ':', ctaUrl, '');
  if (secondary) lines.push(secondary, '');
  lines.push(''.padEnd(50, '-'));
  lines.push(f.sentTo);
  lines.push(f.contact + ' ' + BRAND.contactEmail);
  return lines.join('\n');
}

const STATUS_LABELS = {
  en: {
    pending: 'Pending',
    at_volunteer: 'At a volunteer hub',
    in_transit: 'In transit to the school',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  },
  ka: {
    pending: 'მოლოდინში',
    at_volunteer: 'მოხალისე სკოლაში',
    in_transit: 'გზაშია სკოლისკენ',
    delivered: 'მიტანილია',
    cancelled: 'გაუქმებულია',
  },
};

// -------------------------------------------------------------------------
// Public templates. Same names & arg shapes as before — call sites unchanged.
// Each returns { subject, html, text }.
// -------------------------------------------------------------------------

export const Templates = {
  // 6-digit signup OTP — generated server-side (admin.generateLink) and emailed
  // by us via Maileroo, so delivery never depends on Supabase's email rate limit.
  signupOtp({ code, lang = 'en' }) {
    const cfg = lang === 'ka'
      ? { subject: 'BookBridge — დადასტურების კოდი', heading: 'დაადასტურე ელფოსტა',
          intro: 'შენი ერთჯერადი დადასტურების კოდია:',
          secondary: 'კოდი მალე იწურება. თუ ეს შენ არ მოგითხოვია, უგულებელყავი ეს წერილი.' }
      : { subject: 'Your BookBridge verification code', heading: 'Confirm your email',
          intro: 'Your one-time verification code is:',
          secondary: "This code expires shortly. If you didn't request it, you can safely ignore this email." };
    const codeBlock = `<div style="font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND.tealDark};background:${BRAND.tealSoft};border-radius:10px;padding:18px 12px;text-align:center;margin:4px 0 8px;font-family:ui-monospace,'SF Mono',Menlo,monospace;">${escape(code)}</div>`;
    return {
      subject: cfg.subject,
      html: shell({ lang, preheader: `${cfg.intro} ${code}`, heading: cfg.heading, intro: cfg.intro, body: codeBlock, secondary: cfg.secondary }),
      text: textShell({ lang, heading: cfg.heading, intro: cfg.intro, body: String(code), secondary: cfg.secondary }),
    };
  },

  registration({ fullName, lang = 'en' }) {
    const name = fullName ? ', ' + fullName : '';
    const cfg = lang === 'ka'
      ? {
          subject: 'კეთილი იყოს შენი მობრძანება BookBridge-ში',
          heading: 'მოგესალმებით' + name + '!',
          intro:   'შენი BookBridge-ის ანგარიში მზადაა. დაიწყე იქიდან, რომ აირჩიო სკოლა — დანარჩენი ნაბიჯები ერთი ღილაკის დაშორებითაა.',
          ctaLabel: 'სკოლების ნახვა',
          secondary: 'თუ ეს რეგისტრაცია შენი არ ყოფილა, უგულებელყავი ეს წერილი.',
        }
      : {
          subject: 'Welcome to BookBridge',
          heading: 'Hello' + name + '!',
          intro:   'Your BookBridge account is ready. The fastest way to get started: pick a school — the rest of the flow is one click away.',
          ctaLabel: 'Browse schools',
          secondary: "If you didn't create this account, you can safely ignore this email.",
        };
    const ctaUrl = `${BRAND.url}/${lang}/schools`;
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, ctaLabel: cfg.ctaLabel, ctaUrl, secondary: cfg.secondary }),
      text:    textShell({ lang, heading: cfg.heading, intro: cfg.intro, ctaLabel: cfg.ctaLabel, ctaUrl, secondary: cfg.secondary }),
    };
  },

  donationConfirmed({ donationId, trackUrl, lang = 'en' }) {
    const short = String(donationId).slice(0, 8);
    const cfg = lang === 'ka'
      ? {
          subject: `დონაცია #${short} მიღებულია`,
          heading: 'მადლობა შენი დონაციისთვის!',
          intro:   `მივიღეთ შენი დონაცია <strong>#${short}</strong>. შემდეგი ნაბიჯი — ჩვენი მოხალისე სკოლა მიიღებს წიგნებს და გადასცემს ბენეფიციარს.`,
          body:    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray};">სტატუსს ნებისმიერ დროს ნახავ ქვემოთ მოცემული ბმულით — შენახე ეს წერილი, რომ მოგვიანებითაც გადახედო.</p>`,
          ctaLabel: 'სტატუსის თვალთვალი',
        }
      : {
          subject: `Donation #${short} received`,
          heading: 'Thank you for your donation!',
          intro:   `We received your donation <strong>#${short}</strong>. Next step: a volunteer school will pick up the books and pass them on to the beneficiary.`,
          body:    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray};">You can check the status any time with the link below — save this email so you can come back to it later.</p>`,
          ctaLabel: 'Track this donation',
        };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, body: cfg.body, ctaLabel: cfg.ctaLabel, ctaUrl: trackUrl }),
      text:    textShell({ lang, heading: cfg.heading, intro: stripTags(cfg.intro), body: stripTags(cfg.body), ctaLabel: cfg.ctaLabel, ctaUrl: trackUrl }),
    };
  },

  statusChanged({ donationId, status, trackUrl, lang = 'en' }) {
    const short = String(donationId).slice(0, 8);
    const label = STATUS_LABELS[lang]?.[status] || status;
    const cfg = lang === 'ka'
      ? {
          subject: `დონაცია #${short}: ${label}`,
          heading: 'შენი დონაცია გადავიდა შემდეგ ეტაპზე',
          intro:   `დონაცია <strong>#${short}</strong> ახლა — <strong>${label}</strong>.`,
          ctaLabel: 'სტატუსის ნახვა',
        }
      : {
          subject: `Donation #${short}: ${label}`,
          heading: 'Your donation moved to the next step',
          intro:   `Donation <strong>#${short}</strong> is now <strong>${label}</strong>.`,
          ctaLabel: 'See status',
        };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, ctaLabel: cfg.ctaLabel, ctaUrl: trackUrl }),
      text:    textShell({ lang, heading: cfg.heading, intro: stripTags(cfg.intro), ctaLabel: cfg.ctaLabel, ctaUrl: trackUrl }),
    };
  },

  donationDelivered({ donationId, schoolName, trackUrl, lang = 'en' }) {
    const short = String(donationId).slice(0, 8);
    const school = schoolName || (lang === 'ka' ? 'სკოლა' : 'the school');
    const cfg = lang === 'ka'
      ? {
          subject: 'შენი წიგნი მიტანილია მთაში',
          heading: 'წიგნი მთებშია',
          intro:   `<strong>${escape(school)}</strong> მიიღო შენი დონაცია <strong>#${short}</strong>. წიგნებს ხელში დაიჭერენ ბავშვები მთებში.`,
          body:    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray};">ჩვენ თვითონ ვუყურებთ ამ წერილს და ვიცინებთ — გმადლობთ, რომ შენ ხარ ხიდი.</p>`,
          ctaLabel: 'მთლიანი ისტორიის ნახვა',
        }
      : {
          subject: 'Your book arrived in the mountains',
          heading: 'The book is in the mountains',
          intro:   `<strong>${escape(school)}</strong> received your donation <strong>#${short}</strong>. The books are about to be in the hands of kids in the highlands.`,
          body:    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray};">We re-read this email ourselves and smile every time — thank you for being the bridge.</p>`,
          ctaLabel: 'See the full story',
        };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, body: cfg.body, ctaLabel: cfg.ctaLabel, ctaUrl: trackUrl }),
      text:    textShell({ lang, heading: cfg.heading, intro: stripTags(cfg.intro), body: stripTags(cfg.body), ctaLabel: cfg.ctaLabel, ctaUrl: trackUrl }),
    };
  },

  monetaryReceipt({ amountMinor, currency, lang = 'en' }) {
    const amount = (amountMinor / 100).toFixed(2);
    const formatted = `${amount} ${currency}`;
    const cfg = lang === 'ka'
      ? {
          subject: 'მადლობა შემოწირულობისთვის',
          heading: 'მიღებულია ' + formatted,
          intro:   'მადლობა, რომ მხარს უჭერ BookBridge-ის სატრანსპორტო და მოხალისე ხარჯებს.',
          body:    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 16px;background:${BRAND.tealSoft};border-radius:10px;">
            <tr><td style="padding:16px 20px;font-size:14px;color:${BRAND.ink};">
              <strong>თანხა:</strong> ${formatted}<br>
              <strong>თარიღი:</strong> ${new Date().toLocaleDateString('ka-GE')}
            </td></tr>
          </table>`,
          secondary: 'ეს წერილი შენი ქვითარია — შეგიძლია შეინახო ან დაბეჭდო.',
        }
      : {
          subject: 'Thank you for your donation',
          heading: 'Received ' + formatted,
          intro:   "Thank you for funding BookBridge's logistics and volunteer costs.",
          body:    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 16px;background:${BRAND.tealSoft};border-radius:10px;">
            <tr><td style="padding:16px 20px;font-size:14px;color:${BRAND.ink};">
              <strong>Amount:</strong> ${formatted}<br>
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}
            </td></tr>
          </table>`,
          secondary: 'This email is your receipt — keep it for your records or print it.',
        };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, body: cfg.body, secondary: cfg.secondary }),
      text:    textShell({ lang, heading: cfg.heading, intro: cfg.intro, body: `Amount: ${formatted}\nDate: ${new Date().toISOString().slice(0, 10)}`, secondary: cfg.secondary }),
    };
  },

  // Sent to the school owner when an admin approves their listing.
  schoolApproved({ schoolName, manageUrl, publicUrl, lang = 'en' }) {
    const name = schoolName || (lang === 'ka' ? 'შენი სკოლა' : 'your school');
    const cfg = lang === 'ka'
      ? {
          subject: `დამტკიცდა: ${name}`,
          heading: 'შენი სკოლა დამტკიცდა!',
          intro:   `<strong>${escape(name)}</strong> ახლა ხილვადია BookBridge-ზე და მზადაა მიიღოს წიგნები. შეგიძლია მართო პროფილი და დაამატო სასურველი წიგნების სია.`,
          ctaLabel: 'სკოლის მართვა',
        }
      : {
          subject: `Approved: ${name}`,
          heading: 'Your school is approved!',
          intro:   `<strong>${escape(name)}</strong> is now visible on BookBridge and ready to receive books. You can manage its profile and post a wishlist of the books you need.`,
          ctaLabel: 'Manage your school',
        };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, ctaLabel: cfg.ctaLabel, ctaUrl: manageUrl, secondary: publicUrl ? `Public page: <a href="${publicUrl}" style="color:${BRAND.teal};">${publicUrl}</a>` : '' }),
      text:    textShell({ lang, heading: cfg.heading, intro: stripTags(cfg.intro), ctaLabel: cfg.ctaLabel, ctaUrl: manageUrl }),
    };
  },

  // Sent to the school owner when an admin rejects their listing.
  schoolRejected({ schoolName, note, lang = 'en' }) {
    const name = schoolName || (lang === 'ka' ? 'შენი სკოლა' : 'your school');
    const noteBlock = note
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.gray};"><strong>${lang === 'ka' ? 'შენიშვნა' : 'Note'}:</strong> ${escape(note)}</p>`
      : '';
    const cfg = lang === 'ka'
      ? {
          subject: `განახლება: ${name}`,
          heading: 'შენი სკოლის განაცხადი ვერ დამტკიცდა',
          intro:   `სამწუხაროდ, <strong>${escape(name)}</strong> ამჟამად ვერ დამტკიცდა. გთხოვ, შეამოწმო დეტალები და ხელახლა გამოაგზავნო.`,
        }
      : {
          subject: `Update on ${name}`,
          heading: 'Your school submission needs another look',
          intro:   `Unfortunately <strong>${escape(name)}</strong> wasn't approved yet. Please review the details and resubmit.`,
        };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: stripTags(cfg.intro), heading: cfg.heading, intro: cfg.intro, body: noteBlock }),
      text:    textShell({ lang, heading: cfg.heading, intro: stripTags(cfg.intro), body: note ? `Note: ${note}` : '' }),
    };
  },

  // Sent to admins when a new school is submitted and awaits approval.
  schoolSubmitted({ schoolName, schoolType, reviewUrl, lang = 'en' }) {
    const cfg = {
      subject: `New ${schoolType || 'school'} awaiting approval: ${schoolName || ''}`.trim(),
      heading: 'A new school needs approval',
      intro:   `<strong>${escape(schoolName || 'A school')}</strong> (${escape(schoolType || 'school')}) was just submitted on BookBridge and is waiting in the approval queue.`,
      ctaLabel: 'Review in admin',
    };
    return {
      subject: cfg.subject,
      html:    shell({ lang, preheader: cfg.intro, heading: cfg.heading, intro: cfg.intro, ctaLabel: cfg.ctaLabel, ctaUrl: reviewUrl }),
      text:    textShell({ lang, heading: cfg.heading, intro: stripTags(cfg.intro), ctaLabel: cfg.ctaLabel, ctaUrl: reviewUrl }),
    };
  },
};

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
