const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, unique: true, index: true },
    productName: { type: String, required: true, trim: true, index: true },
    brand: { type: String, trim: true, default: '', index: true },
    color: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1, productName: 1 });

const Product = mongoose.model('Product', ProductSchema);

module.exports = { Product };
