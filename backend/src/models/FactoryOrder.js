const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, index: true },
    productName: { type: String, required: true, trim: true, index: true },
    brand: { type: String, trim: true, default: '', index: true },
    color: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const FactoryOrderSchema = new mongoose.Schema(
  {
    factoryName: { type: String, required: true, trim: true, index: true },
    orderDate: { type: Date, required: true, index: true },
    deliveryDate: { type: Date, index: true },
    estimatedProductionDays: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['未生产', '生产中', '部分发货', '已完成'],
      default: '未生产',
      index: true
    },
    items: { type: [OrderItemSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

FactoryOrderSchema.index({ factoryName: 1, orderDate: -1 });
FactoryOrderSchema.index({ orderDate: -1 });
FactoryOrderSchema.index({ 'items.sku': 1, 'items.productName': 1 });
FactoryOrderSchema.index({ 'items.brand': 1 });

const FactoryOrder = mongoose.model('FactoryOrder', FactoryOrderSchema);

module.exports = { FactoryOrder };

