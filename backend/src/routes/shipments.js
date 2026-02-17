const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listShipments, createShipment, deleteShipment } = require('../controllers/shipmentsController');

const shipmentsRouter = express.Router();

const ShipmentLineZ = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(0)
});

const LogisticsZ = z
  .object({
    carrier: z.string().optional(),
    trackingNo: z.string().optional(),
    note: z.string().optional()
  })
  .optional();

const ShipmentCreateZ = z.object({
  orderId: z.string().min(1),
  shippedAt: z.coerce.date(),
  lines: z.array(ShipmentLineZ).min(1),
  logistics: LogisticsZ
});

shipmentsRouter.get(
  '/',
  validate({ query: z.object({ orderId: z.string().optional() }) }),
  asyncHandler(listShipments)
);
shipmentsRouter.post('/', validate({ body: ShipmentCreateZ }), asyncHandler(createShipment));
shipmentsRouter.delete('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(deleteShipment));

module.exports = { shipmentsRouter };

