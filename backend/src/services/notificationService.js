const nodemailer = require('nodemailer');
const env = require('../config/env');
const Settings = require('../models/Settings');
const AdminUser = require('../models/AdminUser');

let transporter = null;
function getTransporter() {
  if (!env.smtp.isConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
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
    const mailer = getTransporter();
    if (!mailer) {
      console.log(`[email] SMTP not configured — skipped "${subject}"`);
      return { sent: false, reason: 'SMTP not configured' };
    }
    const settings = await Settings.getSingleton();
    const recipients = to || (await resolveRecipients(settings));
    if (!recipients.length) {
      console.warn(`[email] No admin recipients — skipped "${subject}"`);
      return { sent: false, reason: 'No recipients' };
    }
    const { html, text } = render({ agencyName: settings.agencyName, heading, intro, rows, link });
    await mailer.sendMail({
      from: env.smtp.from,
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

function configStatus() {
  return { configured: env.smtp.isConfigured, host: env.smtp.host || null, from: env.smtp.from || null };
}

module.exports = { sendAdminEmail, notifyApplicationSubmitted, notifyPaymentFailed, configStatus, _render: render };
