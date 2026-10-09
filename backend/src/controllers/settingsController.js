const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const mpesaService = require('../services/mpesaService');
const notifications = require('../services/notificationService');
const { normalizeKenyanPhone } = require('../utils/phoneUtils');
const { encrypt } = require('../utils/secretBox');

const MAX_HERO_IMAGES = 6;
const PUBLIC_PREFIX = '/uploads/public/';

const removePublicFile = (url) => {
  if (!url || !url.startsWith(PUBLIC_PREFIX)) return Promise.resolve();
  return fs.unlink(path.join(env.uploads.publicDir, path.basename(url))).catch(() => {});
};

const settingsJSON = (settings) => ({
  ...settings.toPublicJSON(),
  applicationNumberPrefix: settings.applicationNumberPrefix,
  updatedAt: settings.updatedAt,
  mpesa: mpesaService.configStatus(),
  notificationEmails: settings.notificationEmails,
  notifyOnSubmission: settings.notifyOnSubmission,
  notifyOnPaymentFailure: settings.notifyOnPaymentFailure,
  email: notifications.configStatus(settings),
});

exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ success: true, data: { settings: settingsJSON(settings) } });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const b = req.body;
  const textFields = ['agencyName', 'heroHeadline', 'heroSubheadline', 'contactEmail', 'contactPhone', 'address'];
  for (const f of textFields) {
    if (b[f] !== undefined) settings[f] = String(b[f] ?? '').trim();
  }
  if (b.whatsappNumber !== undefined) {
    const raw = String(b.whatsappNumber || '').trim();
    if (raw) {
      const normalized = normalizeKenyanPhone(raw) || (/^\d{10,15}$/.test(raw.replace(/^\+/, '')) ? raw.replace(/^\+/, '') : null);
      if (!normalized) throw ApiError.badRequest('Enter a valid WhatsApp number including country code');
      settings.whatsappNumber = normalized;
    } else {
      settings.whatsappNumber = '';
    }
  }
  if (b.applicationFee !== undefined) {
    const fee = Math.round(Number(b.applicationFee));
    if (!Number.isFinite(fee) || fee < 1 || fee > 150000) throw ApiError.badRequest('Fee must be between 1 and 150,000 KES');
    settings.applicationFee = fee;
  }
  if (b.applicationNumberPrefix !== undefined) {
    const prefix = String(b.applicationNumberPrefix).toUpperCase().trim();
    if (!/^[A-Z0-9]{2,10}$/.test(prefix)) throw ApiError.badRequest('Prefix must be 2–10 letters or digits');
    settings.applicationNumberPrefix = prefix;
  }
  if (b.notificationEmails !== undefined) {
    const list = (Array.isArray(b.notificationEmails) ? b.notificationEmails : String(b.notificationEmails).split(/[,;\s]+/))
      .map((e) => String(e).trim().toLowerCase())
      .filter(Boolean);
    const invalid = list.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalid) throw ApiError.badRequest(`Invalid notification email: ${invalid}`);
    if (list.length > 20) throw ApiError.badRequest('At most 20 notification emails');
    settings.notificationEmails = [...new Set(list)];
  }
  if (b.smtp && typeof b.smtp === 'object') {
    const smtp = b.smtp;
    const text = (v, max) => String(v ?? '').trim().slice(0, max);
    if (smtp.host !== undefined) {
      const host = text(smtp.host, 255);
      if (host && !/^[a-z0-9.-]+$/i.test(host)) throw ApiError.badRequest('Enter a valid SMTP host, e.g. smtp.gmail.com');
      settings.smtp.host = host;
    }
    if (smtp.port !== undefined) {
      const port = parseInt(smtp.port, 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw ApiError.badRequest('SMTP port must be 1–65535');
      settings.smtp.port = port;
    }
    if (smtp.secure !== undefined) settings.smtp.secure = smtp.secure === true || smtp.secure === 'true';
    if (smtp.user !== undefined) settings.smtp.user = text(smtp.user, 255);
    if (smtp.from !== undefined) settings.smtp.from = text(smtp.from, 255);
    // Password is write-only: a non-empty value replaces it, clearPassword removes it.
    if (smtp.clearPassword === true) settings.smtp.passEncrypted = '';
    else if (typeof smtp.password === 'string' && smtp.password !== '') {
      settings.smtp.passEncrypted = encrypt(smtp.password.slice(0, 500));
    }
    if (settings.smtp.host && !settings.smtp.from) {
      throw ApiError.badRequest('Enter a "From" address for outgoing email');
    }
  }
  for (const f of ['notifyOnSubmission', 'notifyOnPaymentFailure']) {
    if (b[f] !== undefined) settings[f] = b[f] === true || b[f] === 'true';
  }
  if (b.manifestRequired !== undefined) settings.manifestRequired = b.manifestRequired === true || b.manifestRequired === 'true';

  await settings.save();
  res.json({ success: true, data: { settings: settingsJSON(settings) } });
});

exports.uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please choose an image (field name "logo")');
  const settings = await Settings.getSingleton();
  const old = settings.logoUrl;
  settings.logoUrl = `${PUBLIC_PREFIX}${req.file.filename}`;
  await settings.save();
  await removePublicFile(old);
  res.json({ success: true, data: { settings: settingsJSON(settings) } });
});

exports.removeLogo = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const old = settings.logoUrl;
  settings.logoUrl = '';
  await settings.save();
  await removePublicFile(old);
  res.json({ success: true, data: { settings: settingsJSON(settings) } });
});

exports.uploadHeroImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('Please choose at least one image (field name "images")');
  const settings = await Settings.getSingleton();
  if (settings.heroImages.length + files.length > MAX_HERO_IMAGES) {
    await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
    throw ApiError.badRequest(`You can have at most ${MAX_HERO_IMAGES} hero images`);
  }
  settings.heroImages.push(...files.map((f) => `${PUBLIC_PREFIX}${f.filename}`));
  await settings.save();
  res.json({ success: true, data: { settings: settingsJSON(settings) } });
});

exports.deleteHeroImage = asyncHandler(async (req, res) => {
  const url = String(req.body.url || req.query.url || '');
  const settings = await Settings.getSingleton();
  if (!settings.heroImages.includes(url)) throw ApiError.notFound('Image not found');
  settings.heroImages = settings.heroImages.filter((u) => u !== url);
  await settings.save();
  await removePublicFile(url);
  res.json({ success: true, data: { settings: settingsJSON(settings) } });
});

exports.sendTestEmail = asyncHandler(async (req, res) => {
  const result = await notifications.sendAdminEmail({
    subject: 'Test notification',
    heading: 'Email notifications are working',
    intro: `This test was sent by ${req.admin.name} from Admin → Settings.`,
    rows: [['Sent at', new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' }) + ' EAT']],
  });
  if (!result.sent) throw ApiError.badRequest(`Test email not sent: ${result.reason}`);
  res.json({ success: true, data: { recipients: result.recipients }, message: `Test email sent to ${result.recipients.join(', ')}` });
});
