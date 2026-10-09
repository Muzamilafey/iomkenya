const mongoose = require('mongoose');

const SETTINGS_KEY = 'GLOBAL_SETTINGS';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: SETTINGS_KEY, unique: true, immutable: true },
    agencyName: { type: String, default: 'Horizon Travel Assistance', trim: true, maxlength: 120 },
    heroHeadline: {
      type: String,
      default: 'Apply for travel assistance in a few simple steps',
      trim: true,
      maxlength: 200,
    },
    heroSubheadline: {
      type: String,
      default:
        'Complete your application online, upload your documents and pay securely with M-Pesa. Track your progress any time.',
      trim: true,
      maxlength: 500,
    },
    logoUrl: { type: String, default: '' },
    heroImages: { type: [String], default: [] },
    contactEmail: { type: String, default: '', trim: true, maxlength: 160 },
    contactPhone: { type: String, default: '', trim: true, maxlength: 30 },
    address: { type: String, default: '', trim: true, maxlength: 300 },
    whatsappNumber: { type: String, default: '', trim: true, maxlength: 15 },
    applicationFee: { type: Number, default: 1500, min: 1, max: 150000 },
    applicationNumberPrefix: { type: String, default: 'APP', trim: true, uppercase: true, maxlength: 10 },
    manifestRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function getSingleton() {
  return this.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

settingsSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    agencyName: this.agencyName,
    heroHeadline: this.heroHeadline,
    heroSubheadline: this.heroSubheadline,
    logoUrl: this.logoUrl,
    heroImages: this.heroImages,
    contactEmail: this.contactEmail,
    contactPhone: this.contactPhone,
    address: this.address,
    whatsappNumber: this.whatsappNumber,
    applicationFee: this.applicationFee,
    manifestRequired: this.manifestRequired,
  };
};

module.exports = mongoose.model('Settings', settingsSchema);
module.exports.SETTINGS_KEY = SETTINGS_KEY;
