const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, unique: true, index: true },
    productName: { type: String, required: true, trim: true, index: true },
    brand: { type: String, trim: true, default: '', index: true },
    shop: { type: String, trim: true, default: '', index: true }, // 店铺
    category: { type: String, trim: true, default: '' }, // 类目（原分类）
    
    // 亚马逊相关标识
    asin: { type: String, trim: true, default: '', index: true },
    parentAsin: { type: String, trim: true, default: '', index: true },
    fnsku: { type: String, trim: true, default: '', index: true },
    
    color: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    
    // 内箱尺寸（单位：cm）
    innerBoxLength: { type: Number, min: 0, default: 0 },
    innerBoxWidth: { type: Number, min: 0, default: 0 },
    innerBoxHeight: { type: Number, min: 0, default: 0 },
    innerBoxWeight: { type: Number, min: 0, default: 0 }, // 内箱重量（单位：kg）
    
    imageUrl: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1, productName: 1 });

const Product = mongoose.model('Product', ProductSchema);

module.exports = { Product };
