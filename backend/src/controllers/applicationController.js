const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const Application = require('../models/Application');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { hashToken } = require('../middleware/draftAccess');
const { normalizeKenyanPhone } = require('../utils/phoneUtils');
const { checkApplicationCompleteness } = require('../utils/applicationCompleteness');
const { generateApplicationNumber } = require('../services/applicationNumberService');
const {
  EDITABLE_STATUSES,
  DOCUMENT_TYPES,
  MAX_FAMILY_MEMBERS,
  SPONSOR_RELATIONSHIPS,
  FAMILY_RELATIONSHIPS,
} = require('../utils/constants');

// --- input helpers ---------------------------------------------------------

const str = (v, max) => {
  if (v === undefined) return undefined;
  if (v === null) return '';
  return String(v).trim().slice(0, max);
};

const date = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Invalid date');
  if (d > new Date()) throw ApiError.badRequest('Dates cannot be in the future');
  if (d.getFullYear() < 1900) throw ApiError.badRequest('Invalid date');
  return d;
};

const bool = (v) => (v === undefined ? undefined : v === true || v === 'true');

const oneOf = (v, list) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return '';
  if (!list.includes(v)) throw ApiError.badRequest(`Invalid value: ${v}`);
  return v;
};

function setIfDefined(target, key, value) {
  if (value !== undefined) target[key] = value;
}

/** Translates a PATCH body into a whitelisted $set object. */
function buildUpdate(body) {
  const set = {};

  if (body.applicant && typeof body.applicant === 'object') {
    const a = body.applicant;
    setIfDefined(set, 'applicant.fullName', str(a.fullName, 120));
    setIfDefined(set, 'applicant.dateOfBirth', date(a.dateOfBirth));
    setIfDefined(set, 'applicant.gender', str(a.gender, 20));
    setIfDefined(set, 'applicant.nationality', str(a.nationality, 60));
  }

  if (body.familyMembers !== undefined) {
    if (!Array.isArray(body.familyMembers)) throw ApiError.badRequest('familyMembers must be an array');
    if (body.familyMembers.length > MAX_FAMILY_MEMBERS) {
      throw ApiError.badRequest(`At most ${MAX_FAMILY_MEMBERS} family members are allowed`);
    }
    set.familyMembers = body.familyMembers.map((m) => ({
      fullName: str(m?.fullName, 120) || '',
      relationship: oneOf(m?.relationship, FAMILY_RELATIONSHIPS) || '',
      dateOfBirth: date(m?.dateOfBirth) || null,
    }));
  }

  if (body.refugeeInfo && typeof body.refugeeInfo === 'object') {
    const r = body.refugeeInfo;
    setIfDefined(set, 'refugeeInfo.refugeeId', str(r.refugeeId, 60));
    setIfDefined(set, 'refugeeInfo.settlementName', str(r.settlementName, 120));
    setIfDefined(set, 'refugeeInfo.arrivalDate', date(r.arrivalDate));
  }

  if (body.manifest && typeof body.manifest === 'object') {
    setIfDefined(set, 'manifest.hasManifest', bool(body.manifest.hasManifest));
    setIfDefined(set, 'manifest.manifestNumber', str(body.manifest.manifestNumber, 60));
  }

  if (body.sponsor && typeof body.sponsor === 'object') {
    const s = body.sponsor;
    setIfDefined(set, 'sponsor.fullName', str(s.fullName, 120));
    setIfDefined(set, 'sponsor.relationship', oneOf(s.relationship, SPONSOR_RELATIONSHIPS));
    if (s.phone !== undefined) {
      const raw = str(s.phone, 20);
      // Keep partially-typed numbers as-is during drafting; normalise when valid.
      set['sponsor.phone'] = normalizeKenyanPhone(raw) || raw.replace(/[^\d+]/g, '').slice(0, 13);
    }
    setIfDefined(set, 'sponsor.email', str(s.email, 160));
  }

  if (body.consent && typeof body.consent === 'object') {
    const accuracy = bool(body.consent.accuracyConfirmed);
    const terms = bool(body.consent.termsAccepted);
    setIfDefined(set, 'consent.accuracyConfirmed', accuracy);
    setIfDefined(set, 'consent.termsAccepted', terms);
    if (accuracy && terms) set['consent.consentedAt'] = new Date();
  }

  if (body.currentStep !== undefined) {
    const step = parseInt(body.currentStep, 10);
    if (!Number.isInteger(step) || step < 1 || step > 6) throw ApiError.badRequest('Invalid step');
    set.currentStep = step;
  }

  return set;
}

function assertEditable(application) {
  if (!EDITABLE_STATUSES.includes(application.status)) {
    throw ApiError.conflict('This application has already been submitted and can no longer be edited');
  }
}

// --- handlers ----------------------------------------------------------------

exports.createApplication = asyncHandler(async (req, res) => {
  const draftToken = crypto.randomBytes(32).toString('hex');
  const application = await Application.create({ draftTokenHash: hashToken(draftToken), status: 'DRAFT' });
  await ApplicationStatusHistory.record({ application: application._id, toStatus: 'DRAFT', note: 'Application started' });
  res.status(201).json({ success: true, data: { application: application.toClientJSON(), draftToken } });
});

exports.getApplication = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { application: req.application.toClientJSON() } });
});

exports.updateApplication = asyncHandler(async (req, res) => {
  assertEditable(req.application);
  const set = buildUpdate(req.body || {});
  if (Object.keys(set).length === 0) {
    return res.json({ success: true, data: { application: req.application.toClientJSON() } });
  }
  const updated = await Application.findOneAndUpdate(
    { _id: req.application._id, status: { $in: EDITABLE_STATUSES } },
    { $set: set },
    { new: true, runValidators: true }
  );
  if (!updated) throw ApiError.conflict('This application can no longer be edited');
  res.json({ success: true, data: { application: updated.toClientJSON() } });
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const application = req.application;

  const cleanup = () => (req.file ? fs.unlink(req.file.path).catch(() => {}) : Promise.resolve());

  if (!DOCUMENT_TYPES.includes(type)) {
    await cleanup();
    throw ApiError.badRequest('Unknown document type');
  }
  if (!EDITABLE_STATUSES.includes(application.status)) {
    await cleanup();
    throw ApiError.conflict('This application has already been submitted and can no longer be edited');
  }
  if (!req.file) throw ApiError.badRequest('Please choose a file to upload (field name "file")');

  const previous = application.getDocument(type);
  const doc = {
    type,
    storedName: req.file.filename,
    originalName: path.basename(req.file.originalname || '').slice(0, 255),
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date(),
  };

  application.documents = application.documents.filter((d) => d.type !== type);
  application.documents.push(doc);
  await application.save();

  if (previous) {
    fs.unlink(path.join(env.uploads.dir, path.basename(previous.storedName))).catch(() => {});
  }

  res.status(201).json({ success: true, data: { application: application.toClientJSON() } });
});

exports.reviewApplication = asyncHandler(async (req, res) => {
  const application = req.application;
  assertEditable(application);

  const settings = await Settings.getSingleton();
  const missing = checkApplicationCompleteness(application, settings);
  if (missing.length) {
    throw new ApiError(422, 'Some required information is missing', { missing });
  }

  const fromStatus = application.status;
  if (!application.applicationNumber) {
    application.applicationNumber = await generateApplicationNumber(settings.applicationNumberPrefix);
  }
  if (!application.applicationFeeAtSubmission) {
    // Rounded once here so the amount shown, stored and charged are identical.
    application.applicationFeeAtSubmission = Math.round(settings.applicationFee);
  }
  application.status = 'AWAITING_PAYMENT';
  application.reviewedAt = new Date();
  application.currentStep = 7;
  await application.save();

  if (fromStatus !== 'AWAITING_PAYMENT') {
    await ApplicationStatusHistory.record({
      application: application._id,
      fromStatus,
      toStatus: 'AWAITING_PAYMENT',
      note: 'Client completed review and consent',
    });
  }

  res.json({ success: true, data: { application: application.toClientJSON() } });
});

exports._buildUpdate = buildUpdate; // exported for tests
