const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const env = require('../config/env');
const Application = require('../models/Application');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ADMIN_SETTABLE_STATUSES, DOCUMENT_TYPES } = require('../utils/constants');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds a Mongo filter from list/report query params. */
function buildApplicationFilter(query) {
  const filter = {};
  if (query.status) filter.status = String(query.status);
  else if (query.includeDrafts !== 'true') filter.status = { $ne: 'DRAFT' };
  if (query.paymentStatus) filter.paymentStatus = String(query.paymentStatus);

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      const d = new Date(query.from);
      if (!Number.isNaN(d.getTime())) filter.createdAt.$gte = d;
    }
    if (query.to) {
      const d = new Date(query.to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }
  }

  const q = String(query.q || '').trim().slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ 'applicant.fullName': rx }, { 'sponsor.fullName': rx }, { applicationNumber: rx }, { 'sponsor.phone': rx }];
  }
  return filter;
}

async function loadApplication(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Application not found');
  const application = await Application.findById(id);
  if (!application) throw ApiError.notFound('Application not found');
  return application;
}

exports.buildApplicationFilter = buildApplicationFilter;

exports.listApplications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = buildApplicationFilter(req.query);

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('applicationNumber applicant.fullName sponsor.fullName sponsor.phone status paymentStatus familyMembers applicationFeeAtSubmission createdAt submittedAt'),
    Application.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((a) => ({
        id: a._id,
        applicationNumber: a.applicationNumber,
        applicantName: a.applicant?.fullName,
        sponsorName: a.sponsor?.fullName,
        sponsorPhone: a.sponsor?.phone,
        familyCount: a.familyMembers.length,
        status: a.status,
        paymentStatus: a.paymentStatus,
        fee: a.applicationFeeAtSubmission,
        createdAt: a.createdAt,
        submittedAt: a.submittedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

exports.getApplication = asyncHandler(async (req, res) => {
  const application = await loadApplication(req.params.id);
  const [history, payments] = await Promise.all([
    ApplicationStatusHistory.find({ application: application._id }).sort({ createdAt: 1 }),
    Payment.find({ application: application._id })
      .sort({ createdAt: -1 })
      .select('-rawStkResponse -rawCallback -rawQueryResponse'),
  ]);
  res.json({
    success: true,
    data: {
      application: { ...application.toClientJSON(), adminNotes: application.adminNotes, reviewedAt: application.reviewedAt, paidAt: application.paidAt, submittedAt: application.submittedAt },
      history,
      payments,
    },
  });
});

exports.streamDocument = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!DOCUMENT_TYPES.includes(type)) throw ApiError.notFound('Document not found');
  const application = await loadApplication(req.params.id);
  const doc = application.getDocument(type);
  if (!doc) throw ApiError.notFound('Document not found');

  const filePath = path.join(env.uploads.dir, path.basename(doc.storedName));
  if (!fs.existsSync(filePath)) throw ApiError.notFound('Document file is missing on the server');

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${(application.applicationNumber || 'application')}-${type.toLowerCase()}${path.extname(doc.storedName)}"`
  );
  fs.createReadStream(filePath).pipe(res);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!ADMIN_SETTABLE_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');

  const application = await loadApplication(req.params.id);
  if (application.paymentStatus !== 'PAID' && status !== 'CANCELLED') {
    throw ApiError.conflict('Only paid applications can be moved through the review process');
  }
  if (application.status === status) throw ApiError.badRequest(`Application is already ${status}`);

  const fromStatus = application.status;
  application.status = status;
  await application.save();
  await ApplicationStatusHistory.record({
    application: application._id,
    fromStatus,
    toStatus: status,
    admin: req.admin,
    note: note ? String(note).trim().slice(0, 2000) : undefined,
  });

  const history = await ApplicationStatusHistory.find({ application: application._id }).sort({ createdAt: 1 });
  res.json({ success: true, data: { status: application.status, history } });
});

exports.addNote = asyncHandler(async (req, res) => {
  const application = await loadApplication(req.params.id);
  application.adminNotes.push({
    note: String(req.body.note).trim().slice(0, 2000),
    author: req.admin._id,
    authorName: req.admin.name,
  });
  await application.save();
  res.status(201).json({ success: true, data: { adminNotes: application.adminNotes } });
});

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

exports.summaryPdf = asyncHandler(async (req, res) => {
  const application = await loadApplication(req.params.id);
  const settings = await Settings.getSingleton();
  const payments = await Payment.find({ application: application._id, status: 'PAID' }).sort({ createdAt: -1 });

  const filename = `${application.applicationNumber || application._id}-summary.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');

  const pdf = new PDFDocument({ size: 'A4', margin: 50 });
  pdf.pipe(res);

  pdf.fontSize(18).font('Helvetica-Bold').text(settings.agencyName);
  pdf.fontSize(11).font('Helvetica').fillColor('#555').text('Client Application Summary');
  pdf.moveDown(0.5).fillColor('#000');
  pdf.fontSize(10).text(`Generated ${new Date().toLocaleString('en-GB')} by ${req.admin.name}`);
  pdf.moveDown();

  const section = (title) => {
    pdf.moveDown(0.6).fontSize(13).font('Helvetica-Bold').fillColor('#1e3a8a').text(title);
    pdf.moveTo(pdf.page.margins.left, pdf.y).lineTo(pdf.page.width - pdf.page.margins.right, pdf.y).strokeColor('#cbd5e1').stroke();
    pdf.moveDown(0.3).fontSize(10).font('Helvetica').fillColor('#000');
  };
  const row = (label, value) => {
    pdf.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value ? String(value) : '—');
  };

  const photo = (type) => {
    const doc = application.getDocument(type);
    if (!doc) return null;
    const p = path.join(env.uploads.dir, path.basename(doc.storedName));
    return fs.existsSync(p) ? p : null;
  };

  section('Application');
  row('Application number', application.applicationNumber);
  row('Status', application.status);
  row('Payment status', application.paymentStatus);
  row('Fee (KES)', application.applicationFeeAtSubmission);
  row('Created', fmtDate(application.createdAt));
  row('Submitted', fmtDate(application.submittedAt));

  section('Applicant');
  const applicantPhoto = photo('APPLICANT_PASSPORT_PHOTO');
  const top = pdf.y;
  row('Full name', application.applicant?.fullName);
  row('Date of birth', fmtDate(application.applicant?.dateOfBirth));
  row('Gender', application.applicant?.gender);
  row('Nationality', application.applicant?.nationality);
  if (applicantPhoto) {
    try {
      pdf.image(applicantPhoto, pdf.page.width - 150, top, { fit: [100, 120] });
      pdf.y = Math.max(pdf.y, top + 125);
    } catch {
      /* unreadable image — skip */
    }
  }

  section(`Family members (${application.familyMembers.length})`);
  if (!application.familyMembers.length) pdf.text('None listed');
  application.familyMembers.forEach((m, i) => {
    pdf.text(`${i + 1}. ${m.fullName || '—'} — ${m.relationship || '—'} — born ${fmtDate(m.dateOfBirth)}`);
  });

  section('Refugee stay & manifest');
  row('Refugee ID', application.refugeeInfo?.refugeeId);
  row('Camp / settlement', application.refugeeInfo?.settlementName);
  row('Arrival date', fmtDate(application.refugeeInfo?.arrivalDate));
  row('Has manifest', application.manifest?.hasManifest ? 'Yes' : 'No');
  row('Manifest number', application.manifest?.manifestNumber);
  row('Manifest card uploaded', application.getDocument('MANIFEST_CARD') ? 'Yes' : 'No');

  section('Sponsor');
  const sponsorPhoto = photo('SPONSOR_PASSPORT_PHOTO');
  const sTop = pdf.y;
  row('Full name', application.sponsor?.fullName);
  row('Relationship', application.sponsor?.relationship);
  row('Phone', application.sponsor?.phone);
  row('Email', application.sponsor?.email);
  if (sponsorPhoto) {
    try {
      pdf.image(sponsorPhoto, pdf.page.width - 150, sTop, { fit: [100, 120] });
      pdf.y = Math.max(pdf.y, sTop + 125);
    } catch {
      /* skip */
    }
  }

  section('Payment');
  if (!payments.length) pdf.text('No confirmed payment');
  payments.forEach((p) => {
    pdf.text(`KES ${p.amount} — receipt ${p.mpesaReceiptNumber || '—'} — ${p.phone} — ${fmtDate(p.completedAt)}`);
  });

  section('Consent');
  row('Information confirmed accurate', application.consent?.accuracyConfirmed ? 'Yes' : 'No');
  row('Terms & privacy accepted', application.consent?.termsAccepted ? 'Yes' : 'No');
  row('Consented at', application.consent?.consentedAt ? new Date(application.consent.consentedAt).toLocaleString('en-GB') : null);

  pdf.end();
});
