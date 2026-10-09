const Payment = require('../models/Payment');
const Application = require('../models/Application');
const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const mpesaService = require('../services/mpesaService');
const { applyResultToPayment } = require('../services/paymentProcessingService');
const { normalizeKenyanPhone } = require('../utils/phoneUtils');
const { checkApplicationCompleteness } = require('../utils/applicationCompleteness');

const REUSE_PENDING_WINDOW_MS = 90 * 1000;
const QUERY_MIN_AGE_MS = 20 * 1000;
const QUERY_INTERVAL_MS = 10 * 1000;
const EXPIRE_AFTER_MS = 5 * 60 * 1000;

function paymentStatusJSON(payment, application) {
  return {
    checkoutRequestId: payment.checkoutRequestId,
    status: payment.status,
    amount: payment.amount,
    resultCode: payment.resultCode ?? null,
    resultDesc: payment.resultDesc ?? null,
    mpesaReceiptNumber: payment.mpesaReceiptNumber ?? null,
    applicationNumber: application?.applicationNumber ?? null,
    applicationStatus: application?.status ?? null,
  };
}

exports.initiatePayment = asyncHandler(async (req, res) => {
  const application = req.application;

  if (application.paymentStatus === 'PAID' || !['AWAITING_PAYMENT'].includes(application.status)) {
    if (application.paymentStatus === 'PAID') throw ApiError.conflict('This application has already been paid');
    throw ApiError.conflict('Please complete the review step before paying');
  }

  const settings = await Settings.getSingleton();
  const missing = checkApplicationCompleteness(application, settings);
  if (missing.length) throw new ApiError(422, 'Some required information is missing', { missing });

  const phone = normalizeKenyanPhone(req.body.phone);
  if (!phone) throw ApiError.badRequest('Enter a valid Safaricom number, e.g. 0712 345 678');

  const amount = application.applicationFeeAtSubmission;
  if (!amount || amount < 1) throw ApiError.conflict('Application fee has not been set. Please contact support.');

  // Reuse a very recent pending attempt so the client is never double-prompted.
  const recent = await Payment.findOne({
    application: application._id,
    status: 'PENDING',
    phone,
    createdAt: { $gte: new Date(Date.now() - REUSE_PENDING_WINDOW_MS) },
  }).sort({ createdAt: -1 });
  if (recent?.checkoutRequestId) {
    return res.json({
      success: true,
      data: { ...paymentStatusJSON(recent, application), reused: true },
      message: 'A payment request was just sent to this phone. Please check your phone.',
    });
  }

  if (!mpesaService.configStatus().configured) {
    throw new ApiError(503, 'Online payment is temporarily unavailable. Please try again later.');
  }

  const payment = await Payment.create({ application: application._id, phone, amount, status: 'PENDING' });

  let stk;
  try {
    stk = await mpesaService.stkPush({
      phone,
      amount,
      accountReference: application.applicationNumber.replace(/[^A-Z0-9]/gi, '').slice(-12),
      description: 'App fee',
    });
  } catch (err) {
    const data = err.response?.data;
    console.error('[mpesa] STK push failed:', data || err.message);
    payment.status = 'FAILED';
    payment.resultDesc = data?.errorMessage || 'Could not send payment request';
    payment.rawStkResponse = data;
    payment.completedAt = new Date();
    await payment.save();
    await Application.updateOne({ _id: application._id, paymentStatus: { $ne: 'PAID' } }, { paymentStatus: 'FAILED' });
    throw new ApiError(502, 'We could not send the M-Pesa request. Please check the number and try again.');
  }

  payment.rawStkResponse = stk;
  if (String(stk.ResponseCode) !== '0' || !stk.CheckoutRequestID) {
    payment.status = 'FAILED';
    payment.resultCode = String(stk.ResponseCode ?? '');
    payment.resultDesc = stk.ResponseDescription || stk.CustomerMessage;
    payment.completedAt = new Date();
    await payment.save();
    throw new ApiError(502, stk.CustomerMessage || 'M-Pesa rejected the payment request. Please try again.');
  }

  payment.merchantRequestId = stk.MerchantRequestID;
  payment.checkoutRequestId = stk.CheckoutRequestID;
  await payment.save();
  await Application.updateOne({ _id: application._id, paymentStatus: { $ne: 'PAID' } }, { paymentStatus: 'PENDING' });

  res.status(201).json({
    success: true,
    data: paymentStatusJSON(payment, application),
    message: stk.CustomerMessage || 'Check your phone and enter your M-Pesa PIN to complete payment.',
  });
});

/**
 * Daraja callback. Always acknowledged with 200 so Safaricom does not retry
 * forever; state changes are only applied for a CheckoutRequestID we issued.
 */
exports.mpesaCallback = async (req, res) => {
  try {
    const cb = req.body?.Body?.stkCallback;
    if (cb?.CheckoutRequestID) {
      await applyResultToPayment({
        checkoutRequestId: String(cb.CheckoutRequestID),
        resultCode: cb.ResultCode,
        resultDesc: cb.ResultDesc,
        callbackMetadata: cb.CallbackMetadata?.Item,
        raw: req.body,
        source: 'CALLBACK',
      });
    } else {
      console.warn('[mpesa] Callback without stkCallback.CheckoutRequestID ignored');
    }
  } catch (err) {
    console.error('[mpesa] Error processing callback:', err);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
};

exports.getPaymentStatus = asyncHandler(async (req, res) => {
  const checkoutRequestId = String(req.params.checkoutRequestId || '').slice(0, 100);
  let payment = await Payment.findOne({ checkoutRequestId });
  if (!payment) throw ApiError.notFound('Payment not found');

  const age = Date.now() - payment.createdAt.getTime();
  const sinceQuery = payment.lastQueriedAt ? Date.now() - payment.lastQueriedAt.getTime() : Infinity;

  // Active fallback when the callback is late.
  if (payment.status === 'PENDING' && age > QUERY_MIN_AGE_MS && sinceQuery > QUERY_INTERVAL_MS) {
    await Payment.updateOne({ _id: payment._id }, { lastQueriedAt: new Date() });
    try {
      const q = await mpesaService.stkQuery(checkoutRequestId);
      if (!q.pending) {
        payment =
          (await applyResultToPayment({
            checkoutRequestId,
            resultCode: q.resultCode,
            resultDesc: q.resultDesc,
            raw: q.raw,
            source: 'QUERY',
          })) || payment;
      }
    } catch (err) {
      console.warn('[mpesa] Status query failed:', err.response?.data || err.message);
    }

    if (payment.status === 'PENDING' && age > EXPIRE_AFTER_MS) {
      payment =
        (await applyResultToPayment({
          checkoutRequestId,
          resultCode: '1037',
          resultDesc: 'No response received from M-Pesa in time',
          raw: { expiredBy: 'server' },
          source: 'QUERY',
        })) || payment;
    }
  }

  const application = await Application.findById(payment.application).select('applicationNumber status');
  res.json({ success: true, data: paymentStatusJSON(payment, application) });
});
