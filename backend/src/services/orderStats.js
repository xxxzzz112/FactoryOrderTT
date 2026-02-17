const mongoose = require('mongoose');
const { FactoryOrder } = require('../models/FactoryOrder');

function buildOrdersMatchFromQuery(q) {
  const match = {};

  if (q.factoryName) match.factoryName = q.factoryName;
  if (q.status) match.status = q.status;

  if (q.sku) match['items.sku'] = q.sku;
  if (q.productName) match['items.productName'] = new RegExp(escapeRegExp(q.productName), 'i');
  if (q.brand) match['items.brand'] = new RegExp(escapeRegExp(q.brand), 'i');

  if (q.orderFrom || q.orderTo) {
    match.orderDate = {};
    if (q.orderFrom) match.orderDate.$gte = new Date(q.orderFrom);
    if (q.orderTo) match.orderDate.$lte = new Date(q.orderTo);
  }

  if (q.deliveryFrom || q.deliveryTo) {
    match.deliveryDate = {};
    if (q.deliveryFrom) match.deliveryDate.$gte = new Date(q.deliveryFrom);
    if (q.deliveryTo) match.deliveryDate.$lte = new Date(q.deliveryTo);
  }

  return match;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getOrderStats(orderId) {
  const _id = new mongoose.Types.ObjectId(orderId);
  const rows = await FactoryOrder.aggregate([
    { $match: { _id } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$_id',
        orderedQuantity: { $sum: '$items.quantity' }
      }
    },
    {
      $lookup: {
        from: 'shipments',
        localField: '_id',
        foreignField: 'orderId',
        as: 'shipments'
      }
    },
    { $unwind: { path: '$shipments', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$shipments.lines', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id',
        orderedQuantity: { $first: '$orderedQuantity' },
        shippedQuantity: { $sum: { $ifNull: ['$shipments.lines.quantity', 0] } }
      }
    },
    {
      $project: {
        _id: 1,
        orderedQuantity: 1,
        shippedQuantity: 1,
        remainingQuantity: { $max: [{ $subtract: ['$orderedQuantity', '$shippedQuantity'] }, 0] }
      }
    }
  ]);

  return rows[0] ?? { orderedQuantity: 0, shippedQuantity: 0, remainingQuantity: 0 };
}

function computeAutoStatus({ currentStatus, orderedQuantity, shippedQuantity }) {
  if (orderedQuantity <= 0) return currentStatus;
  if (shippedQuantity >= orderedQuantity) return '已完成';
  if (shippedQuantity > 0) return '部分发货';
  if (currentStatus === '部分发货' || currentStatus === '已完成') return '生产中';
  return currentStatus; // 未生产 / 生产中 保留
}

module.exports = { getOrderStats, computeAutoStatus, buildOrdersMatchFromQuery };

