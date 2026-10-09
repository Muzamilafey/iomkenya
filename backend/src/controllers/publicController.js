const Application = require('../models/Application');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeKenyanPhone } = require('../utils/phoneUtils');

exports.getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ success: true, data: { settings: settings.toPublicJSON() } });
});

exports.statusCheck = asyncHandler(async (req, res) => {
  const applicationNumber = String(req.body.applicationNumber || '').trim().toUpperCase();
  const phone = normalizeKenyanPhone(req.body.phone);
  const notFound = ApiError.notFound('No application matches that number and phone. Please check and try again.');
  if (!applicationNumber || !phone) throw notFound;

  const application = await Application.findOne({ applicationNumber, 'sponsor.phone': phone }).select(
    'applicationNumber status paymentStatus applicant.fullName submittedAt updatedAt'
  );
  if (!application) throw notFound;

  // Only reveal the applicant's first name.
  const firstName = (application.applicant?.fullName || '').split(/\s+/)[0] || null;
  res.json({
    success: true,
    data: {
      applicationNumber: application.applicationNumber,
      applicantFirstName: firstName,
      status: application.status,
      paymentStatus: application.paymentStatus,
      submittedAt: application.submittedAt,
      lastUpdated: application.updatedAt,
    },
  });
});
