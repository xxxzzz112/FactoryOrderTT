const { ProductFactorySpec } = require('../models/ProductFactorySpec');
const { asyncHandler } = require('../middleware/asyncHandler');

// 获取工厂规格列表
exports.getProductFactorySpecs = asyncHandler(async (req, res) => {
  const { sku, factoryName } = req.query;
  const filter = {};
  if (sku) filter.sku = sku;
  if (factoryName) filter.factoryName = factoryName;

  const specs = await ProductFactorySpec.find(filter).sort({ updatedAt: -1 });
  res.json({ data: specs });
});

// 创建或更新工厂规格
exports.upsertProductFactorySpec = asyncHandler(async (req, res) => {
  const { sku, factoryName, outerBoxLength, outerBoxWidth, outerBoxHeight, pcsPerCarton, notes } = req.body;

  if (!sku || !factoryName) {
    return res.status(400).json({ error: { message: 'SKU和工厂名称必填' } });
  }

  const spec = await ProductFactorySpec.findOneAndUpdate(
    { sku, factoryName },
    {
      outerBoxLength: outerBoxLength || 0,
      outerBoxWidth: outerBoxWidth || 0,
      outerBoxHeight: outerBoxHeight || 0,
      pcsPerCarton: pcsPerCarton || 0,
      notes: notes || ''
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ data: spec });
});

// 删除工厂规格
exports.deleteProductFactorySpec = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await ProductFactorySpec.findByIdAndDelete(id);
  res.json({ message: '删除成功' });
});
