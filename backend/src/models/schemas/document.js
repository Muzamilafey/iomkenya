const { Schema } = require('mongoose');
const { DOCUMENT_TYPES } = require('../../utils/constants');

// Metadata for an uploaded file. `storedName` is server-generated; the
// client's original filename is kept for display only and never used on disk.
const documentSchema = new Schema(
  {
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    storedName: { type: String, required: true },
    originalName: { type: String, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

module.exports = documentSchema;
