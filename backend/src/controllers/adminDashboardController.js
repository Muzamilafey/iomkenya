const Application = require('../models/Application');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/constants');

exports.getStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [byStatus, todayCount, revenueAgg, pendingPayments] = await Promise.all([
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.countDocuments({ createdAt: { $gte: startOfToday }, status: { $ne: 'DRAFT' } }),
    Payment.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Payment.countDocuments({ status: 'PENDING' }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const total = byStatus.reduce((acc, s) => acc + (s._id === 'DRAFT' ? 0 : s.count), 0);

  const data = {
    totals: {
      applications: total,
      drafts: statusCounts.DRAFT || 0,
      awaitingPayment: statusCounts.AWAITING_PAYMENT || 0,
      submitted: statusCounts.SUBMITTED || 0,
      inReview: (statusCounts.UNDER_REVIEW || 0) + (statusCounts.PROCESSING || 0) + (statusCounts.ADDITIONAL_INFO_REQUIRED || 0),
      approved: (statusCounts.APPROVED || 0) + (statusCounts.COMPLETED || 0),
      declined: statusCounts.DECLINED || 0,
      today: todayCount,
    },
    statusCounts,
    revenue: { total: revenueAgg[0]?.total || 0, paidCount: revenueAgg[0]?.count || 0, pendingPayments },
    recentApplications: [],
  };

  if (req.admin.role !== ROLES.FINANCE_OFFICER) {
    const recent = await Application.find({ status: { $ne: 'DRAFT' } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('applicationNumber applicant.fullName status paymentStatus createdAt');
    data.recentApplications = recent.map((a) => ({
      id: a._id,
      applicationNumber: a.applicationNumber,
      applicantName: a.applicant?.fullName,
      status: a.status,
      paymentStatus: a.paymentStatus,
      createdAt: a.createdAt,
    }));
  }

  res.json({ success: true, data });
});
