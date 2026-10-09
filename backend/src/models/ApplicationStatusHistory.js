const mongoose = require('mongoose');
const { Schema } = mongoose;
const { APPLICATION_STATUSES } = require('../utils/constants');

const historySchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    fromStatus: { type: String, enum: [null, ...APPLICATION_STATUSES], default: null },
    toStatus: { type: String, enum: APPLICATION_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    changedByName: { type: String, default: 'System' },
    note: { type: String, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

historySchema.statics.record = function record({ application, fromStatus, toStatus, admin, note }) {
  return this.create({
    application,
    fromStatus: fromStatus ?? null,
    toStatus,
    changedBy: admin?._id ?? null,
    changedByName: admin?.name ?? 'System',
    note,
  });
};

module.exports = mongoose.model('ApplicationStatusHistory', historySchema);
