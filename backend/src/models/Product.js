const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, unique: true, index: true },
    productName: { type: String, required: true, trim: true, index: true },
    brand: { type: String, trim: true, default: '', index: true },
    category: { type: String, trim: true, default: '' }, // 类目（原分类）
    color: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    
    // 内箱尺寸（单位：cm）
    innerBoxLength: { type: Number, min: 0, default: 0 },
    innerBoxWidth: { type: Number, min: 0, default: 0 },
    innerBoxHeight: { type: Number, min: 0, default: 0 },
    
    unitPrice: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1, productName: 1 });

const Product = mongoose.model('Product', ProductSchema);

module.exports = { Product };
