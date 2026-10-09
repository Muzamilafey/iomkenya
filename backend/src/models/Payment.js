const mongoose = require('mongoose');
const { Schema } = mongoose;
const { PAYMENT_STATUSES } = require('../utils/constants');

// One document per STK push attempt.
const paymentSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    phone: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING', index: true },

    merchantRequestId: { type: String },
    checkoutRequestId: { type: String, unique: true, sparse: true },

    mpesaReceiptNumber: { type: String, index: true },
    transactionDate: { type: Date },
    resultCode: { type: String },
    resultDesc: { type: String },
    resultSource: { type: String, enum: [null, 'CALLBACK', 'QUERY'], default: null },

    rawStkResponse: { type: Schema.Types.Mixed },
    rawCallback: { type: Schema.Types.Mixed },
    rawQueryResponse: { type: Schema.Types.Mixed },

    lastQueriedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
