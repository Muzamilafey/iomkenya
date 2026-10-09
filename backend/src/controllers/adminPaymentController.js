const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildPaymentFilter(query) {
  const filter = {};
  if (query.status) filter.status = String(query.status);
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) {
      const d = new Date(query.to);
      d.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = d;
    }
  }
  const q = String(query.q || '').trim().slice(0, 60);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ phone: rx }, { mpesaReceiptNumber: rx }, { checkoutRequestId: rx }];
  }
  return filter;
}

exports.buildPaymentFilter = buildPaymentFilter;

exports.listPayments = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const filter = buildPaymentFilter(req.query);

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-rawStkResponse -rawCallback -rawQueryResponse')
      .populate('application', 'applicationNumber applicant.fullName'),
    Payment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((p) => ({
        id: p._id,
        applicationId: p.application?._id,
        applicationNumber: p.application?.applicationNumber,
        applicantName: p.application?.applicant?.fullName,
        phone: p.phone,
        amount: p.amount,
        status: p.status,
        checkoutRequestId: p.checkoutRequestId,
        mpesaReceiptNumber: p.mpesaReceiptNumber,
        resultCode: p.resultCode,
        resultDesc: p.resultDesc,
        resultSource: p.resultSource,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});
