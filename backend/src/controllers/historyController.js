const mongoose = require('mongoose');
const { FactoryOrder } = require('../models/FactoryOrder');
const { Shipment } = require('../models/Shipment');

async function factoryHistory(req, res) {
  const { factoryName } = req.validated.query;

  const orders = await FactoryOrder.find({ factoryName })
    .sort({ deliveryDate: -1, createdAt: -1 })
    .lean();

  const orderIds = orders.map((o) => o._id);

  const shipments = await Shipment.find({ orderId: { $in: orderIds } })
    .sort({ shippedAt: -1, createdAt: -1 })
    .lean();

  const shipmentsByOrder = {};
  for (const s of shipments) {
    const key = String(s.orderId);
    if (!shipmentsByOrder[key]) shipmentsByOrder[key] = [];
    shipmentsByOrder[key].push(s);
  }

  const data = orders.map((o) => {
    const orderedQuantity = o.items.reduce((sum, it) => sum + it.quantity, 0);
    const orderShipments = shipmentsByOrder[String(o._id)] || [];
    const shippedQuantity = orderShipments.reduce(
      (sum, s) => sum + s.lines.reduce((ss, l) => ss + l.quantity, 0),
      0
    );
    return {
      ...o,
      orderedQuantity,
      shippedQuantity,
      remainingQuantity: Math.max(orderedQuantity - shippedQuantity, 0),
      shipments: orderShipments
    };
  });

  res.json({ factoryName, data });
}

async function skuHistory(req, res) {
  const { sku } = req.validated.query;

  const orders = await FactoryOrder.find({ 'items.sku': sku })
    .sort({ deliveryDate: -1, createdAt: -1 })
    .lean();

  const orderIds = orders.map((o) => o._id);

  const shipments = await Shipment.find({
    orderId: { $in: orderIds },
    'lines.sku': sku
  })
    .sort({ shippedAt: -1, createdAt: -1 })
    .lean();

  const shipmentsByOrder = {};
  for (const s of shipments) {
    const key = String(s.orderId);
    if (!shipmentsByOrder[key]) shipmentsByOrder[key] = [];
    shipmentsByOrder[key].push(s);
  }

  const data = orders.map((o) => {
    const skuItems = o.items.filter((it) => it.sku === sku);
    const orderedQuantity = skuItems.reduce((sum, it) => sum + it.quantity, 0);
    const orderShipments = shipmentsByOrder[String(o._id)] || [];
    const shippedQuantity = orderShipments.reduce(
      (sum, s) =>
        sum + s.lines.filter((l) => l.sku === sku).reduce((ss, l) => ss + l.quantity, 0),
      0
    );
    return {
      orderId: o._id,
      factoryName: o.factoryName,
      deliveryDate: o.deliveryDate,
      status: o.status,
      skuItems,
      orderedQuantity,
      shippedQuantity,
      remainingQuantity: Math.max(orderedQuantity - shippedQuantity, 0),
      shipments: orderShipments.map((s) => ({
        ...s,
        lines: s.lines.filter((l) => l.sku === sku)
      }))
    };
  });

  const totalOrdered = data.reduce((s, d) => s + d.orderedQuantity, 0);
  const totalShipped = data.reduce((s, d) => s + d.shippedQuantity, 0);

  res.json({
    sku,
    totalOrdered,
    totalShipped,
    totalRemaining: Math.max(totalOrdered - totalShipped, 0),
    data
  });
}

module.exports = { factoryHistory, skuHistory };
