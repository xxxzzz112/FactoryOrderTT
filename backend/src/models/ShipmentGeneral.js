const mongoose = require('mongoose');

// 发货行 Schema
const ShipmentLineSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    productName: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

// 通用发货单 Schema（不关联订单）
const ShipmentGeneralSchema = new mongoose.Schema(
  {
    factoryName: { type: String, required: true, trim: true, index: true },
    shippedAt: { type: Date, required: true, index: true },
    lines: { type: [ShipmentLineSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    forwarder: { type: String, trim: true, default: '' }, // 货代
    logistics: {
      carrier: { type: String, trim: true, default: '' },
      trackingNo: { type: String, trim: true, default: '' },
      note: { type: String, trim: true, default: '' }
    },
    recipient: { type: String, trim: true, default: '' }, // 收货人/客户
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

ShipmentGeneralSchema.index({ factoryName: 1, shippedAt: -1 });
ShipmentGeneralSchema.index({ 'lines.sku': 1 });

const ShipmentGeneral = mongoose.model('ShipmentGeneral', ShipmentGeneralSchema);

module.exports = { ShipmentGeneral };
