const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema(
  {
    factoryName: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, trim: true, index: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    location: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// 唯一索引：每个工厂每个SKU只能有一条库存记录
InventorySchema.index({ factoryName: 1, sku: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', InventorySchema);

module.exports = { Inventory };
