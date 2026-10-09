const { Schema } = require('mongoose');

// See note in familyMember.js on relaxed `required`.
const sponsorSchema = new Schema(
  {
    fullName: { type: String, trim: true, maxlength: 120 },
    relationship: { type: String, trim: true, maxlength: 40 },
    phone: { type: String, trim: true, maxlength: 12 }, // normalised 254XXXXXXXXX
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
  },
  { _id: false }
);

module.exports = sponsorSchema;
