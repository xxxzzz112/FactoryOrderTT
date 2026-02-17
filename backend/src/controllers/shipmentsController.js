const mongoose = require('mongoose');
const { Shipment } = require('../models/Shipment');
const { FactoryOrder } = require('../models/FactoryOrder');
const { Inventory } = require('../models/Inventory');
const { HttpError } = require('../utils/httpError');
const { writeAudit } = require('../services/audit');
const { refreshOrderStatus } = require('./ordersController');

async function getShippedBySku(orderId) {
  const rows = await Shipment.aggregate([
    { $match: { orderId: new mongoose.Types.ObjectId(orderId) } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.sku', shipped: { $sum: '$lines.quantity' } } }
  ]);
  return new Map(rows.map((r) => [r._id, r.shipped]));
}

function buildOrderedBySku(order) {
  const map = new Map();
  for (const it of order.items) {
    map.set(it.sku, (map.get(it.sku) ?? 0) + it.quantity);
  }
  return map;
}

async function listShipments(req, res) {
  const q = req.validated.query;
  const filter = {};
  if (q.orderId) filter.orderId = q.orderId;
  const data = await Shipment.find(filter).sort({ shippedAt: -1, createdAt: -1 }).lean();
  res.json({ data });
}

async function createShipment(req, res) {
  const body = req.validated.body;
  const order = await FactoryOrder.findById(body.orderId).lean();
  if (!order) throw new HttpError(404, '关联订单不存在');

  const orderedBySku = buildOrderedBySku(order);
  const shippedBySku = await getShippedBySku(body.orderId);

  for (const line of body.lines) {
    if (!orderedBySku.has(line.sku)) {
      throw new HttpError(400, '发货行 SKU 不存在于订单', { sku: line.sku });
    }
    const ordered = orderedBySku.get(line.sku) ?? 0;
    const shipped = shippedBySku.get(line.sku) ?? 0;
    if (shipped + line.quantity > ordered) {
      throw new HttpError(400, '发货数量超出订单数量', {
        sku: line.sku,
        ordered,
        shipped,
        tryingToShip: line.quantity
      });
    }
  }

  const shipment = await Shipment.create(body);
  const { stats } = await refreshOrderStatus(body.orderId);

  await writeAudit({
    action: 'shipment.create',
    entityType: 'shipment',
    entityId: shipment._id,
    summary: `创建发货单 order=${body.orderId}`
  });

  res.status(201).json({ shipment, stats });
}

async function deleteShipment(req, res) {
  const { id } = req.validated.params;
  const shipment = await Shipment.findById(id);
  if (!shipment) throw new HttpError(404, '发货单不存在');

  const orderId = shipment.orderId;
  await shipment.deleteOne();
  const { stats } = await refreshOrderStatus(orderId);

  await writeAudit({
    action: 'shipment.delete',
    entityType: 'shipment',
    entityId: new mongoose.Types.ObjectId(id),
    summary: `删除发货单 order=${String(orderId)}`
  });

  res.json({ ok: true, stats });
}

module.exports = { listShipments, createShipment, deleteShipment };

