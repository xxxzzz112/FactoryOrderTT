const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listOrders, createOrder, getOrder, updateOrder, deleteOrder } = require('../controllers/ordersController');

const ordersRouter = express.Router();

const OrderItemZ = z.object({
  sku: z.string().min(1),
  productName: z.string().min(1),
  brand: z.string().optional().default(''),
  color: z.string().optional().default(''),
  size: z.string().optional().default(''),
  quantity: z.number().int().min(0),
  unitPrice: z.number().min(0)
});

const OrderCreateZ = z.object({
  factoryName: z.string().min(1),
  orderDate: z.coerce.date(),
  deliveryDate: z.coerce.date().optional(),
  estimatedProductionDays: z.number().min(0).optional().default(0),
  status: z.enum(['未生产', '生产中', '部分发货', '已完成']).optional(),
  items: z.array(OrderItemZ).min(1),
  notes: z.string().optional().default('')
});

const OrderPatchZ = OrderCreateZ.partial();

const OrdersQueryZ = z.object({
  factoryName: z.string().optional(),
  status: z.enum(['未生产', '生产中', '部分发货', '已完成']).optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  brand: z.string().optional(),
  orderFrom: z.string().optional(),
  orderTo: z.string().optional(),
  deliveryFrom: z.string().optional(),
  deliveryTo: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  sort: z.enum(['orderDateAsc', 'orderDateDesc', 'deliveryDateAsc', 'deliveryDateDesc']).optional()
});

ordersRouter.get('/', validate({ query: OrdersQueryZ }), asyncHandler(listOrders));
ordersRouter.post('/', validate({ body: OrderCreateZ }), asyncHandler(createOrder));
ordersRouter.get('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(getOrder));
ordersRouter.patch(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }), body: OrderPatchZ }),
  asyncHandler(updateOrder)
);
ordersRouter.delete('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(deleteOrder));

module.exports = { ordersRouter };

