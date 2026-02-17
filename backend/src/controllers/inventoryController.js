const { Inventory } = require('../models/Inventory');
const { FactoryOrder } = require('../models/FactoryOrder');
const { HttpError } = require('../utils/httpError');

// 查询某工厂的所有库存
async function listByFactory(req, res) {
  const { factoryName } = req.validated.query;
  if (!factoryName) throw new HttpError(400, '缺少 factoryName 参数');

  const data = await Inventory.find({ factoryName }).sort({ sku: 1 }).lean();
  res.json({ factoryName, data });
}

// 批量更新某工厂的库存（upsert）
async function batchUpdate(req, res) {
  const { factoryName, items } = req.validated.body;
  if (!factoryName || !Array.isArray(items)) {
    throw new HttpError(400, 'factoryName 和 items 必填');
  }

  const updated = [];
  for (const it of items) {
    const existing = await Inventory.findOne({ factoryName, sku: it.sku });
    if (existing) {
      existing.quantity = Number(it.quantity ?? 0);
      if (it.location !== undefined) existing.location = it.location;
      if (it.notes !== undefined) existing.notes = it.notes;
      await existing.save();
      updated.push(existing);
    } else {
      const doc = await Inventory.create({
        factoryName,
        sku: it.sku,
        quantity: Number(it.quantity ?? 0),
        location: it.location || '',
        notes: it.notes || ''
      });
      updated.push(doc);
    }
  }

  res.json({ count: updated.length, data: updated });
}

// 查询某SKU在各工厂的库存分布
async function listBySku(req, res) {
  const { sku } = req.validated.query;
  if (!sku) throw new HttpError(400, '缺少 sku 参数');

  const data = await Inventory.find({ sku }).sort({ factoryName: 1 }).lean();
  const totalQuantity = data.reduce((sum, d) => sum + d.quantity, 0);

  res.json({ sku, totalQuantity, data });
}

// 更新单条库存
async function updateOne(req, res) {
  const { id } = req.validated.params;
  const patch = req.validated.body;

  const inv = await Inventory.findById(id);
  if (!inv) throw new HttpError(404, '库存记录不存在');

  if (patch.quantity !== undefined) inv.quantity = Number(patch.quantity);
  if (patch.location !== undefined) inv.location = patch.location;
  if (patch.notes !== undefined) inv.notes = patch.notes;
  await inv.save();

  res.json(inv);
}

// 删除单条库存
async function deleteOne(req, res) {
  const { id } = req.validated.params;
  const inv = await Inventory.findById(id);
  if (!inv) throw new HttpError(404, '库存记录不存在');
  await inv.deleteOne();
  res.json({ ok: true });
}

// 从工厂订单初始化库存
async function initializeFromOrders(req, res) {
  const { factoryName } = req.validated.body;
  if (!factoryName) throw new HttpError(400, '缺少 factoryName 参数');

  // 1. 查询该工厂的所有订单
  const orders = await FactoryOrder.find({ factoryName }).lean();
  
  if (orders.length === 0) {
    return res.json({ message: '该工厂暂无订单', initialized: 0, skipped: 0, orderCount: 0 });
  }

  // 2. 提取所有 SKU 及其信息
  const skuMap = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      if (!skuMap.has(item.sku)) {
        skuMap.set(item.sku, {
          sku: item.sku,
          productName: item.productName,
          brand: item.brand || '',
          color: item.color || '',
          size: item.size || ''
        });
      }
    }
  }

  // 3. 初始化库存记录（只创建不存在的）
  let initialized = 0;
  let skipped = 0;

  for (const [sku, info] of skuMap.entries()) {
    const existing = await Inventory.findOne({ factoryName, sku });
    if (!existing) {
      await Inventory.create({
        factoryName,
        sku: info.sku,
        quantity: 0,
        location: '',
        notes: `${info.productName} ${info.brand} ${info.color} ${info.size}`.trim()
      });
      initialized++;
    } else {
      skipped++;
    }
  }

  res.json({
    message: `从 ${orders.length} 个订单中提取了 ${skuMap.size} 个SKU`,
    initialized,
    skipped,
    orderCount: orders.length,
    skuCount: skuMap.size
  });
}

module.exports = { listByFactory, batchUpdate, listBySku, updateOne, deleteOne, initializeFromOrders };
