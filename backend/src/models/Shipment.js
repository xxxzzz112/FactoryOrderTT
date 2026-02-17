const mongoose = require('mongoose');

const ShipmentLineSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, index: true },
    quantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const LogisticsSchema = new mongoose.Schema(
  {
    carrier: { type: String, trim: true, default: '' },
    trackingNo: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const ShipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FactoryOrder', required: true, index: true },
    shippedAt: { type: Date, required: true, index: true },
    lines: { type: [ShipmentLineSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    logistics: { type: LogisticsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

ShipmentSchema.index({ orderId: 1, shippedAt: -1 });

const Shipment = mongoose.model('Shipment', ShipmentSchema);

module.exports = { Shipment };

