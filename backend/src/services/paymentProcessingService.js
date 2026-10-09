const Payment = require('../models/Payment');
const Application = require('../models/Application');
const ApplicationStatusHistory = require('../models/ApplicationStatusHistory');
const notifications = require('./notificationService');

function statusForResultCode(code) {
  if (code === '0') return 'PAID';
  if (code === '1032') return 'CANCELLED';
  if (code === '1037') return 'EXPIRED';
  return 'FAILED';
}

// Parses "20261009131522" (EAT) into a Date.
function parseMpesaDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(value || ''));
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 3, mi, s));
}

function metadataToObject(items) {
  const out = {};
  for (const item of items || []) out[item.Name] = item.Value;
  return out;
}

/**
 * Applies a verified M-Pesa result to a payment. Shared by the Daraja
 * callback and the status-query fallback. Idempotent: only a PENDING payment
 * is ever transitioned, and the transition is a conditional atomic update, so
 * a callback and a query racing each other cannot both apply.
 *
 * @param {object} args
 * @param {string} args.checkoutRequestId
 * @param {string|number} args.resultCode
 * @param {string} args.resultDesc
 * @param {Array}  [args.callbackMetadata] CallbackMetadata.Item from the callback
 * @param {object} [args.raw] raw payload to store
 * @param {'CALLBACK'|'QUERY'} args.source
 * @returns {Promise<object|null>} the payment after processing
 */
async function applyResultToPayment({ checkoutRequestId, resultCode, resultDesc, callbackMetadata, raw, source }) {
  const code = String(resultCode);
  let newStatus = statusForResultCode(code);
  const meta = metadataToObject(callbackMetadata);

  const existing = await Payment.findOne({ checkoutRequestId });
  if (!existing) {
    console.warn(`[mpesa] Result for unknown CheckoutRequestID ${checkoutRequestId} ignored`);
    return null;
  }
  if (existing.status !== 'PENDING') return existing;

  let desc = resultDesc;
  if (newStatus === 'PAID' && meta.Amount !== undefined && Math.round(Number(meta.Amount)) !== Math.round(existing.amount)) {
    console.error(`[mpesa] Amount mismatch on ${checkoutRequestId}: expected ${existing.amount}, got ${meta.Amount}`);
    newStatus = 'FAILED';
    desc = `Amount mismatch: expected ${existing.amount}, received ${meta.Amount}`;
  }

  const update = {
    status: newStatus,
    resultCode: code,
    resultDesc: desc,
    resultSource: source,
    completedAt: new Date(),
  };
  if (source === 'CALLBACK') update.rawCallback = raw;
  else update.rawQueryResponse = raw;
  if (meta.MpesaReceiptNumber) update.mpesaReceiptNumber = meta.MpesaReceiptNumber;
  if (meta.TransactionDate) update.transactionDate = parseMpesaDate(meta.TransactionDate);

  const payment = await Payment.findOneAndUpdate(
    { _id: existing._id, status: 'PENDING' },
    { $set: update },
    { new: true }
  );
  if (!payment) return Payment.findById(existing._id); // lost the race — already applied

  console.log(`[mpesa] Payment ${checkoutRequestId} → ${newStatus} (code ${code}, via ${source})`);

  if (newStatus === 'PAID') {
    const now = new Date();
    const app = await Application.findOneAndUpdate(
      { _id: payment.application, status: { $in: ['DRAFT', 'AWAITING_PAYMENT'] } },
      { $set: { status: 'SUBMITTED', paymentStatus: 'PAID', paidAt: now, submittedAt: now } },
      { new: false }
    );
    if (app) {
      await ApplicationStatusHistory.record({
        application: app._id,
        fromStatus: app.status,
        toStatus: 'SUBMITTED',
        note: `M-Pesa payment confirmed${payment.mpesaReceiptNumber ? ` (receipt ${payment.mpesaReceiptNumber})` : ''}`,
      });
      // Fire-and-forget: email problems must never affect payment processing.
      Application.findById(app._id)
        .then((fresh) => fresh && notifications.notifyApplicationSubmitted(fresh, payment))
        .catch((err) => console.error('[email] notify submitted failed:', err.message));
    } else {
      // Already submitted by an earlier payment; just make sure it's marked paid.
      await Application.updateOne({ _id: payment.application }, { $set: { paymentStatus: 'PAID' } });
    }
  } else {
    // Only reflect failure if the application hasn't already been paid.
    await Application.updateOne(
      { _id: payment.application, paymentStatus: { $ne: 'PAID' } },
      { $set: { paymentStatus: newStatus } }
    );
    Application.findById(payment.application)
      .then((fresh) => fresh && notifications.notifyPaymentFailed(fresh, payment))
      .catch((err) => console.error('[email] notify payment failure failed:', err.message));
  }

  return payment;
}

module.exports = { applyResultToPayment, statusForResultCode, parseMpesaDate };
