const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listByFactory, batchUpdate, listBySku, updateOne, deleteOne, initializeFromOrders } = require('../controllers/inventoryController');

const inventoryRouter = express.Router();

// 查询某工厂的所有库存
inventoryRouter.get(
  '/factory',
  validate({ query: z.object({ factoryName: z.string().min(1) }) }),
  asyncHandler(listByFactory)
);

// 批量更新某工厂的库存
const BatchUpdateZ = z.object({
  factoryName: z.string().min(1),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().min(0),
      location: z.string().optional(),
      notes: z.string().optional()
    })
  )
});
inventoryRouter.post('/batch', validate({ body: BatchUpdateZ }), asyncHandler(batchUpdate));

// 查询某SKU在各工厂的库存
inventoryRouter.get(
  '/sku',
  validate({ query: z.object({ sku: z.string().min(1) }) }),
  asyncHandler(listBySku)
);

// 更新单条库存
const PatchZ = z.object({
  quantity: z.number().min(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});
inventoryRouter.patch(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }), body: PatchZ }),
  asyncHandler(updateOne)
);

// 删除单条库存
inventoryRouter.delete(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(deleteOne)
);

// 从工厂订单初始化库存
inventoryRouter.post(
  '/initialize-from-orders',
  validate({ body: z.object({ factoryName: z.string().min(1) }) }),
  asyncHandler(initializeFromOrders)
);

module.exports = { inventoryRouter };
