const { Schema } = require('mongoose');

// Fields are not `required` at schema level: drafts are saved incrementally.
// Completeness is enforced in utils/applicationCompleteness.js.
const familyMemberSchema = new Schema(
  {
    fullName: { type: String, trim: true, maxlength: 120 },
    relationship: { type: String, trim: true, maxlength: 40 },
    dateOfBirth: { type: Date },
  },
  { _id: true }
);

module.exports = familyMemberSchema;
