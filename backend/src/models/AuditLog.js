const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true, index: true }, // e.g. order.create / shipment.create
    entityType: { type: String, required: true, trim: true, index: true }, // order / shipment
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    summary: { type: String, trim: true, default: '' },
    meta: { type: Object, default: null }
  },
  { timestamps: true }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = { AuditLog };

