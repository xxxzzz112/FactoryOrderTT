const mongoose = require('mongoose');

// 产品工厂专属规格（主要是外箱信息）
const ProductFactorySpecSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, index: true },
    factoryName: { type: String, required: true, trim: true, index: true },
    
    // 外箱尺寸（单位：cm）
    outerBoxLength: { type: Number, min: 0, default: 0 },
    outerBoxWidth: { type: Number, min: 0, default: 0 },
    outerBoxHeight: { type: Number, min: 0, default: 0 },
    
    // 单箱装的套数
    pcsPerCarton: { type: Number, min: 0, default: 0 },
    
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// 联合索引：同一个SKU在同一工厂只有一条规格记录
ProductFactorySpecSchema.index({ sku: 1, factoryName: 1 }, { unique: true });

const ProductFactorySpec = mongoose.model('ProductFactorySpec', ProductFactorySpecSchema);

module.exports = { ProductFactorySpec };
