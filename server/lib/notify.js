// Central donor-notification fan-out.
//
// notifyDonorOfStatus(donation) is the ONE place that turns a donation status
// change into user-facing notifications: a branded email AND an in-website
// (in-app) notification. Every status-change site calls only this function
// (admin update, volunteer hub update, school confirm-receipt).
//
// ROADWORK: when an automated delivery/courier system exists, its webhook
// should flip the donation status and then call notifyDonorOfStatus(donation).
// No other change is needed — both channels fan out from here.

import { sendEmail, Templates } from './mailer.js';
import {
  getDonorContact, getSchoolById, recordNotification, createInAppNotification,
} from '../db/store.js';

function trackUrlFor(token) {
  const origin = process.env.PUBLIC_FRONTEND_ORIGIN || 'http://localhost:5173';
  return `${origin}/en/track/${token}`;
}

// Short, friendly in-app message per status (the email carries the full copy).
const IN_APP_BODY = {
  en: {
    pending:      'We received your donation.',
    at_volunteer: 'Your books arrived at a volunteer hub.',
    in_transit:   'Your books are on their way to the school.',
    delivered:    (school) => `Your books reached ${school || 'the school'} in the mountains. 📚`,
    cancelled:    'Your donation was cancelled.',
  },
  ka: {
    pending:      'მივიღეთ შენი დონაცია.',
    at_volunteer: 'შენი წიგნები მოხალისე ჰაბში მივიდა.',
    in_transit:   'შენი წიგნები გზაშია სკოლისკენ.',
    delivered:    (school) => `შენი წიგნები მიაღწია ${school || 'სკოლას'} მთებში. 📚`,
    cancelled:    'შენი დონაცია გაუქმდა.',
  },
};

function inAppBody(status, lang, schoolName) {
  const set = IN_APP_BODY[lang] || IN_APP_BODY.en;
  const v = set[status];
  return typeof v === 'function' ? v(schoolName) : (v || set.at_volunteer);
}

/**
 * Fan out a donation status change to the donor as email + in-app notification.
 * Best-effort: a failure in one channel never blocks the other or the request.
 * @param {object} donation - a donation row (needs id, status, track_token, beneficiary_school_id)
 */
export async function notifyDonorOfStatus(donation) {
  const contact = await getDonorContact(donation.id);
  if (!contact) return;
  const lang = contact.language || 'en';
  const trackUrl = trackUrlFor(donation.track_token);
  const school = donation.beneficiary_school_id ? await getSchoolById(donation.beneficiary_school_id) : null;
  const schoolName = school?.name || '';

  const tpl = donation.status === 'delivered'
    ? Templates.donationDelivered({ donationId: donation.id, schoolName, trackUrl, lang })
    : Templates.statusChanged({ donationId: donation.id, status: donation.status, trackUrl, lang });

  // In-app notification first — always recorded, even if email later fails.
  try {
    await createInAppNotification(contact.user_id, donation.id, tpl.subject, inAppBody(donation.status, lang, schoolName));
  } catch (e) {
    console.error('[notify] in-app record failed:', e.message);
  }

  // Email — best-effort, logged either way.
  if (contact.email) {
    try {
      await sendEmail({ to: contact.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      await recordNotification({
        user_id: contact.user_id, donation_id: donation.id, channel: 'email',
        template: donation.status === 'delivered' ? 'donation_delivered' : 'status_changed',
        recipient: contact.email, subject: tpl.subject, status: 'sent',
      });
    } catch (e) {
      await recordNotification({
        user_id: contact.user_id, donation_id: donation.id, channel: 'email',
        template: 'status_changed', recipient: contact.email,
        subject: tpl.subject, status: 'failed', error_message: e.message,
      });
    }
  }
}
