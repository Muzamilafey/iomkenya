const Application = require('../models/Application');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { toCsv } = require('../utils/csv');
const { buildApplicationFilter } = require('./adminApplicationController');
const { buildPaymentFilter } = require('./adminPaymentController');

const MAX_EXPORT_ROWS = 50000;

exports.summary = asyncHandler(async (req, res) => {
  const dateFilter = buildApplicationFilter({ from: req.query.from, to: req.query.to, includeDrafts: 'true' });
  const paymentDate = buildPaymentFilter({ from: req.query.from, to: req.query.to });

  const [byStatus, byPayment, revenue, perDay] = await Promise.all([
    Application.aggregate([{ $match: dateFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: paymentDate }, { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { ...paymentDate, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Application.aggregate([
      { $match: { ...dateFilter, submittedAt: { $ne: null } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      applicationsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      paymentsByStatus: Object.fromEntries(byPayment.map((s) => [s._id, { count: s.count, amount: s.amount }])),
      totalRevenue: revenue[0]?.total || 0,
      submissionsPerDay: perDay.map((d) => ({ date: d._id, count: d.count })).reverse(),
    },
  });
});

const iso = (d) => (d ? new Date(d).toISOString() : '');
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

exports.applicationsCsv = asyncHandler(async (req, res) => {
  const apps = await Application.find(buildApplicationFilter(req.query)).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS).lean();
  const csv = toCsv(
    [
      'Application Number', 'Status', 'Payment Status', 'Fee (KES)', 'Applicant Name', 'Applicant DOB',
      'Family Members', 'Refugee ID', 'Settlement', 'Manifest Number', 'Sponsor Name', 'Sponsor Relationship',
      'Sponsor Phone', 'Created At', 'Submitted At',
    ],
    apps.map((a) => [
      a.applicationNumber, a.status, a.paymentStatus, a.applicationFeeAtSubmission, a.applicant?.fullName,
      day(a.applicant?.dateOfBirth), (a.familyMembers || []).length, a.refugeeInfo?.refugeeId,
      a.refugeeInfo?.settlementName, a.manifest?.manifestNumber, a.sponsor?.fullName, a.sponsor?.relationship,
      a.sponsor?.phone, iso(a.createdAt), iso(a.submittedAt),
    ])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="applications-${day(new Date())}.csv"`);
  res.send(`﻿${csv}`);
});

exports.paymentsCsv = asyncHandler(async (req, res) => {
  const payments = await Payment.find(buildPaymentFilter(req.query))
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .populate('application', 'applicationNumber')
    .lean();
  const csv = toCsv(
    ['Created At', 'Application Number', 'Phone', 'Amount (KES)', 'Status', 'M-Pesa Receipt', 'Result Code', 'Result Description', 'Checkout Request ID', 'Completed At'],
    payments.map((p) => [
      iso(p.createdAt), p.application?.applicationNumber, p.phone, p.amount, p.status, p.mpesaReceiptNumber,
      p.resultCode, p.resultDesc, p.checkoutRequestId, iso(p.completedAt),
    ])
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payments-${day(new Date())}.csv"`);
  res.send(`﻿${csv}`);
});
