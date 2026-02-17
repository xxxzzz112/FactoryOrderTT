const { ShipmentGeneral } = require('../models/ShipmentGeneral');
const { Inventory } = require('../models/Inventory');
const { HttpError } = require('../utils/httpError');
const { writeAudit } = require('../services/audit');

// 查询发货记录
async function listShipments(req, res) {
  const { factoryName, sku, from, to } = req.validated.query;
  const filter = {};
  
  if (factoryName) filter.factoryName = factoryName;
  if (sku) filter['lines.sku'] = sku;
  if (from || to) {
    filter.shippedAt = {};
    if (from) filter.shippedAt.$gte = new Date(from);
    if (to) filter.shippedAt.$lte = new Date(to);
  }
  
  const data = await ShipmentGeneral.find(filter)
    .sort({ shippedAt: -1, createdAt: -1 })
    .limit(1000)
    .lean();
  
  res.json({ data });
}

// 创建发货单
async function createShipment(req, res) {
  const { factoryName, shippedAt, lines, forwarder, logistics, recipient, notes } = req.validated.body;
  
  // 检查库存是否充足
  for (const line of lines) {
    const inventory = await Inventory.findOne({ factoryName, sku: line.sku });
    if (!inventory) {
      throw new HttpError(400, `工厂"${factoryName}"没有SKU"${line.sku}"的库存记录`);
    }
    if (inventory.quantity < line.quantity) {
      throw new HttpError(400, `库存不足：SKU"${line.sku}"当前库存${inventory.quantity}，发货数量${line.quantity}`);
    }
  }
  
  // 创建发货单
  const shipment = await ShipmentGeneral.create({
    factoryName,
    shippedAt,
    lines,
    forwarder: forwarder || '',
    logistics: logistics || {},
    recipient: recipient || '',
    notes: notes || ''
  });
  
  // 从库存扣除
  for (const line of lines) {
    await Inventory.updateOne(
      { factoryName, sku: line.sku },
      { $inc: { quantity: -line.quantity } }
    );
  }
  
  await writeAudit({
    action: 'shipment.create',
    entityType: 'shipmentGeneral',
    entityId: shipment._id,
    summary: `创建发货单 工厂=${factoryName}`
  });
  
  res.status(201).json(shipment);
}

// 删除发货单
async function deleteShipment(req, res) {
  const { id } = req.validated.params;
  const shipment = await ShipmentGeneral.findById(id);
  if (!shipment) throw new HttpError(404, '发货单不存在');
  
  // 将发货数量加回库存
  for (const line of shipment.lines) {
    const inventory = await Inventory.findOne({ factoryName: shipment.factoryName, sku: line.sku });
    if (inventory) {
      inventory.quantity += line.quantity;
      await inventory.save();
    }
  }
  
  await shipment.deleteOne();
  
  await writeAudit({
    action: 'shipment.delete',
    entityType: 'shipmentGeneral',
    entityId: shipment._id,
    summary: `删除发货单 工厂=${shipment.factoryName}`
  });
  
  res.json({ ok: true });
}

module.exports = { listShipments, createShipment, deleteShipment };
