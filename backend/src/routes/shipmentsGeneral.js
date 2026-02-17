const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listShipments, createShipment, deleteShipment } = require('../controllers/shipmentsGeneralController');

const shipmentsGeneralRouter = express.Router();

// 查询发货记录
const QueryZ = z.object({
  factoryName: z.string().optional(),
  sku: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

shipmentsGeneralRouter.get('/', validate({ query: QueryZ }), asyncHandler(listShipments));

// 创建发货单
const ShipmentLineZ = z.object({
  sku: z.string().min(1),
  productName: z.string().optional().default(''),
  quantity: z.number().min(0)
});

const CreateZ = z.object({
  factoryName: z.string().min(1),
  shippedAt: z.coerce.date(),
  lines: z.array(ShipmentLineZ).min(1),
  forwarder: z.string().optional().default(''),
  logistics: z.object({
    carrier: z.string().optional().default(''),
    trackingNo: z.string().optional().default(''),
    note: z.string().optional().default('')
  }).optional(),
  recipient: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

shipmentsGeneralRouter.post('/', validate({ body: CreateZ }), asyncHandler(createShipment));

// 删除发货单
shipmentsGeneralRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(deleteShipment)
);

module.exports = { shipmentsGeneralRouter };
