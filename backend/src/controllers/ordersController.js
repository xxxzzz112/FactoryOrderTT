const mongoose = require('mongoose');
const { FactoryOrder } = require('../models/FactoryOrder');
const { Shipment } = require('../models/Shipment');
const { Inventory } = require('../models/Inventory');
const { HttpError } = require('../utils/httpError');
const { writeAudit } = require('../services/audit');
const { buildOrdersMatchFromQuery, getOrderStats, computeAutoStatus } = require('../services/orderStats');

function parsePagination(query) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 200);
  return { page, limit, skip: (page - 1) * limit };
}

async function refreshOrderStatus(orderId) {
  const order = await FactoryOrder.findById(orderId);
  if (!order) throw new HttpError(404, '订单不存在');

  const stats = await getOrderStats(orderId);
  const nextStatus = computeAutoStatus({
    currentStatus: order.status,
    orderedQuantity: stats.orderedQuantity,
    shippedQuantity: stats.shippedQuantity
  });

  if (nextStatus !== order.status) {
    order.status = nextStatus;
    await order.save();
  }
  return { order, stats };
}

async function listOrders(req, res) {
  const q = req.validated.query;
  const { page, limit, skip } = parsePagination(q);
  const match = buildOrdersMatchFromQuery(q);

  const sort = {};
  if (q.sort === 'orderDateAsc') sort.orderDate = 1;
  else if (q.sort === 'orderDateDesc') sort.orderDate = -1;
  else if (q.sort === 'deliveryDateAsc') sort.deliveryDate = 1;
  else if (q.sort === 'deliveryDateDesc') sort.deliveryDate = -1;
  else sort.orderDate = -1; // 默认按下单日期降序
  sort.createdAt = -1;

  const [result] = await FactoryOrder.aggregate([
    { $match: match },
    { $sort: sort },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'shipments',
              localField: '_id',
              foreignField: 'orderId',
              as: 'shipments'
            }
          },
          {
            $addFields: {
              orderedQuantity: { $sum: '$items.quantity' },
              orderedAmount: {
                $sum: {
                  $map: {
                    input: '$items',
                    as: 'it',
                    in: { $multiply: ['$$it.quantity', '$$it.unitPrice'] }
                  }
                }
              },
              shippedQuantity: {
                $sum: {
                  $map: {
                    input: '$shipments',
                    as: 's',
                    in: { $sum: '$$s.lines.quantity' }
                  }
                }
              }
            }
          },
          {
            $addFields: {
              remainingQuantity: {
                $max: [{ $subtract: ['$orderedQuantity', '$shippedQuantity'] }, 0]
              }
            }
          },
          { $project: { shipments: 0 } }
        ],
        total: [{ $count: 'count' }]
      }
    }
  ]);

  const total = result?.total?.[0]?.count ?? 0;
  res.json({
    page,
    limit,
    total,
    data: result?.data ?? []
  });
}

async function createOrder(req, res) {
  const body = req.validated.body;
  const order = await FactoryOrder.create(body);
  
  await writeAudit({
    action: 'order.create',
    entityType: 'order',
    entityId: order._id,
    summary: `创建订单 ${order.factoryName}`
  });
  res.status(201).json(order);
}

async function getOrder(req, res) {
  const { id } = req.validated.params;
  const order = await FactoryOrder.findById(id).lean();
  if (!order) throw new HttpError(404, '订单不存在');

  const shipments = await Shipment.find({ orderId: id }).sort({ shippedAt: -1, createdAt: -1 }).lean();
  const stats = await getOrderStats(id);
  res.json({ order, shipments, stats });
}

async function updateOrder(req, res) {
  const { id } = req.validated.params;
  const patch = req.validated.body;

  const order = await FactoryOrder.findById(id);
  if (!order) throw new HttpError(404, '订单不存在');

  // 若更新 items，需保证不小于已发货（按 SKU 校验）
  if (patch.items) {
    const shippedBySku = await Shipment.aggregate([
      { $match: { orderId: new mongoose.Types.ObjectId(id) } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.sku', shipped: { $sum: '$lines.quantity' } } }
    ]);
    const shippedMap = new Map(shippedBySku.map((r) => [r._id, r.shipped]));

    const orderedMap = new Map();
    for (const it of patch.items) orderedMap.set(it.sku, (orderedMap.get(it.sku) ?? 0) + it.quantity);

    for (const [sku, shipped] of shippedMap.entries()) {
      const ordered = orderedMap.get(sku) ?? 0;
      if (ordered < shipped) {
        throw new HttpError(400, '订单数量不能小于已发货数量', { sku, ordered, shipped });
      }
    }
  }

  if (patch.factoryName != null) order.factoryName = patch.factoryName;
  if (patch.deliveryDate != null) order.deliveryDate = patch.deliveryDate;
  if (patch.status != null) order.status = patch.status;
  if (patch.items != null) order.items = patch.items;
  if (patch.notes != null) order.notes = patch.notes;

  await order.save();
  const { stats } = await refreshOrderStatus(id);

  await writeAudit({
    action: 'order.update',
    entityType: 'order',
    entityId: order._id,
    summary: `更新订单 ${order.factoryName}`,
    meta: { fields: Object.keys(patch) }
  });

  res.json({ order, stats });
}

async function deleteOrder(req, res) {
  const { id } = req.validated.params;
  const order = await FactoryOrder.findById(id);
  if (!order) throw new HttpError(404, '订单不存在');

  const shipmentCount = await Shipment.countDocuments({ orderId: id });
  if (shipmentCount > 0) throw new HttpError(400, '该订单已有发货记录，不能删除');

  await order.deleteOne();
  
  await writeAudit({
    action: 'order.delete',
    entityType: 'order',
    entityId: new mongoose.Types.ObjectId(id),
    summary: `删除订单 ${order.factoryName}`
  });
  res.json({ ok: true });
}

module.exports = { listOrders, createOrder, getOrder, updateOrder, deleteOrder, refreshOrderStatus };

