const nodemailer = require('nodemailer');
const env = require('../config/env');
const Settings = require('../models/Settings');
const AdminUser = require('../models/AdminUser');
const { decrypt } = require('../utils/secretBox');

/**
 * Mail server config: the one saved in Admin → Settings wins; otherwise the
 * SMTP_* environment variables. Returns null when neither is complete.
 */
function resolveSmtp(settings) {
  const s = settings?.smtp;
  if (s?.host) {
    if (!s.from) return null;
    const pass = s.passEncrypted ? decrypt(s.passEncrypted) : '';
    if (s.passEncrypted && pass === null) {
      console.error('[email] Stored SMTP password could not be decrypted (JWT_SECRET changed?) — re-enter it in Settings');
      return null;
    }
    return { source: 'portal', host: s.host, port: s.port || 587, secure: Boolean(s.secure), user: s.user, pass, from: s.from };
  }
  if (env.smtp.isConfigured) return { source: 'env', ...env.smtp };
  return null;
}

let cached = { key: null, transporter: null };
function getTransporter(cfg) {
  const key = JSON.stringify([cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass]);
  if (cached.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
      }),
    };
  }
  return cached.transporter;
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const adminLink = (applicationId) => `${env.clientUrl.split(',')[0].trim().replace(/\/$/, '')}/admin/applications/${applicationId}`;

async function resolveRecipients(settings) {
  if (settings.notificationEmails?.length) return settings.notificationEmails;
  const admins = await AdminUser.find({
    isActive: true,
    role: { $in: ['SUPER_ADMIN', 'APPLICATION_OFFICER'] },
  }).select('email');
  return admins.map((a) => a.email);
}

function render({ agencyName, heading, intro, rows, link }) {
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#64748b">${escapeHtml(k)}</td><td style="padding:6px 12px;color:#0f172a;font-weight:600">${escapeHtml(v || '—')}</td></tr>`
    )
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
  <p style="color:#64748b;font-size:13px;margin:0">${escapeHtml(agencyName)}</p>
  <h2 style="color:#1e3a8a;margin:4px 0 12px">${escapeHtml(heading)}</h2>
  <p style="color:#334155">${escapeHtml(intro)}</p>
  <table style="border-collapse:collapse;background:#f8fafc;border-radius:8px;width:100%">${rowsHtml}</table>
  ${link ? `<p style="margin-top:20px"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open in admin dashboard</a></p>` : ''}
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">You receive this because you are an administrator. Notification settings: Admin → Settings.</p>
</div>`;
  const text = [heading, '', intro, '', ...rows.map(([k, v]) => `${k}: ${v || '—'}`), '', link ? `Open: ${link}` : '']
    .join('\n')
    .trim();
  return { html, text };
}

/**
 * Sends an email to the configured admin recipients. Never throws: notification
 * failures must not affect payment processing or other request handling.
 */
async function sendAdminEmail({ subject, heading, intro, rows, link, to }) {
  try {
    const settings = await Settings.getSingleton();
    const cfg = resolveSmtp(settings);
    if (!cfg) {
      console.log(`[email] SMTP not configured — skipped "${subject}"`);
      return { sent: false, reason: 'SMTP not configured' };
    }
    const mailer = getTransporter(cfg);
    const recipients = to || (await resolveRecipients(settings));
    if (!recipients.length) {
      console.warn(`[email] No admin recipients — skipped "${subject}"`);
      return { sent: false, reason: 'No recipients' };
    }
    const { html, text } = render({ agencyName: settings.agencyName, heading, intro, rows, link });
    await mailer.sendMail({
      from: cfg.from,
      to: recipients.join(', '),
      subject: `[${settings.agencyName}] ${subject}`,
      text,
      html,
    });
    console.log(`[email] Sent "${subject}" to ${recipients.length} recipient(s)`);
    return { sent: true, recipients };
  } catch (err) {
    console.error(`[email] Failed to send "${subject}":`, err.message);
    return { sent: false, reason: err.message };
  }
}

async function notifyApplicationSubmitted(application, payment) {
  const settings = await Settings.getSingleton();
  if (!settings.notifyOnSubmission) return { sent: false, reason: 'Disabled' };
  return sendAdminEmail({
    subject: `New application ${application.applicationNumber}`,
    heading: 'New application submitted',
    intro: 'A client has completed their application and the M-Pesa payment was confirmed.',
    rows: [
      ['Application number', application.applicationNumber],
      ['Applicant', application.applicant?.fullName],
      ['Family members', String(application.familyMembers?.length ?? 0)],
      ['Sponsor', application.sponsor?.fullName],
      ['Amount paid', `KES ${payment.amount}`],
      ['M-Pesa receipt', payment.mpesaReceiptNumber],
    ],
    link: adminLink(application._id),
  });
}

async function notifyPaymentFailed(application, payment) {
  const settings = await Settings.getSingleton();
  if (!settings.notifyOnPaymentFailure) return { sent: false, reason: 'Disabled' };
  return sendAdminEmail({
    subject: `Payment ${payment.status.toLowerCase()} for ${application.applicationNumber || 'an application'}`,
    heading: `Payment ${payment.status.toLowerCase()}`,
    intro: 'An M-Pesa payment attempt did not complete. The client can retry from their device.',
    rows: [
      ['Application number', application.applicationNumber],
      ['Applicant', application.applicant?.fullName],
      ['Amount', `KES ${payment.amount}`],
      ['Result', `${payment.resultCode || ''} ${payment.resultDesc || ''}`.trim()],
    ],
    link: adminLink(application._id),
  });
}

/** Non-secret view of the mail settings for the admin Settings page. */
function configStatus(settings) {
  const cfg = resolveSmtp(settings);
  const s = settings?.smtp || {};
  return {
    configured: Boolean(cfg),
    source: cfg?.source || null,
    envConfigured: env.smtp.isConfigured,
    host: s.host || '',
    port: s.port || 587,
    secure: Boolean(s.secure),
    user: s.user || '',
    from: s.from || '',
    passwordSet: Boolean(s.passEncrypted),
  };
}

module.exports = { sendAdminEmail, notifyApplicationSubmitted, notifyPaymentFailed, configStatus, _render: render };
