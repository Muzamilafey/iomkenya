const mongoose = require('mongoose');
const { Schema } = mongoose;
const documentSchema = require('./schemas/document');
const familyMemberSchema = require('./schemas/familyMember');
const sponsorSchema = require('./schemas/sponsor');
const { APPLICATION_STATUSES, PAYMENT_STATUSES } = require('../utils/constants');

/*
 * NOTE: schema-level `required` is intentionally relaxed on applicant, sponsor
 * and family fields. The public wizard saves each step incrementally, so a
 * draft is legitimately incomplete. Completeness is enforced explicitly by
 * utils/applicationCompleteness.js before the application can move to
 * AWAITING_PAYMENT and before an STK push is sent.
 */
const adminNoteSchema = new Schema(
  {
    note: { type: String, required: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    authorName: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const applicationSchema = new Schema(
  {
    // Assigned at review time so abandoned drafts don't consume numbers.
    applicationNumber: { type: String, unique: true, sparse: true },

    // SHA-256 of the random draft token handed to the client on creation.
    draftTokenHash: { type: String, required: true, select: false },

    applicant: {
      fullName: { type: String, trim: true, maxlength: 120 },
      dateOfBirth: { type: Date },
      gender: { type: String, trim: true, maxlength: 20 },
      nationality: { type: String, trim: true, maxlength: 60 },
    },

    familyMembers: { type: [familyMemberSchema], default: [] },

    refugeeInfo: {
      refugeeId: { type: String, trim: true, maxlength: 60 },
      settlementName: { type: String, trim: true, maxlength: 120 },
      arrivalDate: { type: Date },
    },

    manifest: {
      hasManifest: { type: Boolean, default: false },
      manifestNumber: { type: String, trim: true, maxlength: 60 },
    },

    sponsor: { type: sponsorSchema, default: () => ({}) },

    documents: { type: [documentSchema], default: [] },

    consent: {
      accuracyConfirmed: { type: Boolean, default: false },
      termsAccepted: { type: Boolean, default: false },
      consentedAt: { type: Date },
    },

    status: { type: String, enum: APPLICATION_STATUSES, default: 'DRAFT', index: true },
    paymentStatus: { type: String, enum: [null, ...PAYMENT_STATUSES], default: null, index: true },

    currentStep: { type: Number, default: 1, min: 1, max: 8 },
    applicationFeeAtSubmission: { type: Number },

    adminNotes: { type: [adminNoteSchema], default: [] },

    reviewedAt: { type: Date },
    paidAt: { type: Date },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ 'sponsor.phone': 1 });
applicationSchema.index({ 'applicant.fullName': 1 });

applicationSchema.methods.getDocument = function getDocument(type) {
  return this.documents.find((d) => d.type === type);
};

// Shape returned to the public client (no internal notes, no token hash).
applicationSchema.methods.toClientJSON = function toClientJSON() {
  return {
    id: this._id,
    applicationNumber: this.applicationNumber || null,
    applicant: this.applicant,
    familyMembers: this.familyMembers,
    refugeeInfo: this.refugeeInfo,
    manifest: this.manifest,
    sponsor: this.sponsor,
    documents: this.documents.map((d) => ({
      type: d.type,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      uploadedAt: d.uploadedAt,
    })),
    consent: this.consent,
    status: this.status,
    paymentStatus: this.paymentStatus,
    currentStep: this.currentStep,
    applicationFeeAtSubmission: this.applicationFeeAtSubmission ?? null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Application', applicationSchema);
