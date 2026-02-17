const { FactoryOrder } = require('../models/FactoryOrder');
const { buildOrdersMatchFromQuery } = require('../services/orderStats');

async function overview(req, res) {
  const q = req.validated.query;
  const match = buildOrdersMatchFromQuery(q);

  const [row] = await FactoryOrder.aggregate([
    { $match: match },
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
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        orderedQuantity: { $sum: '$orderedQuantity' },
        shippedQuantity: { $sum: '$shippedQuantity' },
        orderedAmount: { $sum: '$orderedAmount' }
      }
    },
    {
      $project: {
        _id: 0,
        orderCount: 1,
        orderedQuantity: 1,
        shippedQuantity: 1,
        remainingQuantity: { $max: [{ $subtract: ['$orderedQuantity', '$shippedQuantity'] }, 0] },
        orderedAmount: 1
      }
    }
  ]);

  res.json(
    row ?? {
      orderCount: 0,
      orderedQuantity: 0,
      shippedQuantity: 0,
      remainingQuantity: 0,
      orderedAmount: 0
    }
  );
}

async function byProduct(req, res) {
  const q = req.validated.query;
  const match = buildOrdersMatchFromQuery(q);

  const data = await FactoryOrder.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: { sku: '$items.sku', productName: '$items.productName' },
        orderedQuantity: { $sum: '$items.quantity' },
        orderedAmount: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        orderIds: { $addToSet: '$_id' }
      }
    },
    {
      $lookup: {
        from: 'shipments',
        let: { orderIds: '$orderIds', sku: '$_id.sku' },
        pipeline: [
          { $match: { $expr: { $in: ['$orderId', '$$orderIds'] } } },
          { $unwind: '$lines' },
          { $match: { $expr: { $eq: ['$lines.sku', '$$sku'] } } },
          { $group: { _id: null, shippedQuantity: { $sum: '$lines.quantity' } } }
        ],
        as: 'shipAgg'
      }
    },
    {
      $addFields: {
        shippedQuantity: { $ifNull: [{ $first: '$shipAgg.shippedQuantity' }, 0] }
      }
    },
    {
      $project: {
        sku: '$_id.sku',
        productName: '$_id.productName',
        orderedQuantity: 1,
        shippedQuantity: 1,
        remainingQuantity: { $max: [{ $subtract: ['$orderedQuantity', '$shippedQuantity'] }, 0] },
        orderedAmount: 1
      }
    },
    { $sort: { orderedQuantity: -1 } }
  ]);

  res.json({ data });
}

async function byFactoryMonth(req, res) {
  const q = req.validated.query;
  const match = buildOrdersMatchFromQuery(q);

  const data = await FactoryOrder.aggregate([
    { $match: match },
    {
      $addFields: {
        month: { $dateToString: { date: '$deliveryDate', format: '%Y-%m' } },
        orderedQuantity: { $sum: '$items.quantity' },
        orderedAmount: {
          $sum: {
            $map: {
              input: '$items',
              as: 'it',
              in: { $multiply: ['$$it.quantity', '$$it.unitPrice'] }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: { factoryName: '$factoryName', month: '$month' },
        orderedQuantity: { $sum: '$orderedQuantity' },
        orderedAmount: { $sum: '$orderedAmount' },
        orderIds: { $addToSet: '$_id' }
      }
    },
    {
      $lookup: {
        from: 'shipments',
        let: { orderIds: '$orderIds' },
        pipeline: [
          { $match: { $expr: { $in: ['$orderId', '$$orderIds'] } } },
          { $unwind: '$lines' },
          { $group: { _id: null, shippedQuantity: { $sum: '$lines.quantity' } } }
        ],
        as: 'shipAgg'
      }
    },
    {
      $addFields: {
        shippedQuantity: { $ifNull: [{ $first: '$shipAgg.shippedQuantity' }, 0] }
      }
    },
    {
      $project: {
        factoryName: '$_id.factoryName',
        month: '$_id.month',
        orderedQuantity: 1,
        shippedQuantity: 1,
        remainingQuantity: { $max: [{ $subtract: ['$orderedQuantity', '$shippedQuantity'] }, 0] },
        orderedAmount: 1
      }
    },
    { $sort: { month: 1, factoryName: 1 } }
  ]);

  res.json({ data });
}

module.exports = { overview, byProduct, byFactoryMonth };

