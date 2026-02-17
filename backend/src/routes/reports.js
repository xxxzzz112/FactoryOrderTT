const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { overview, byProduct, byFactoryMonth } = require('../controllers/reportsController');

const reportsRouter = express.Router();

const ReportQueryZ = z.object({
  factoryName: z.string().optional(),
  status: z.enum(['未生产', '生产中', '部分发货', '已完成']).optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

reportsRouter.get('/overview', validate({ query: ReportQueryZ }), asyncHandler(overview));
reportsRouter.get('/by-product', validate({ query: ReportQueryZ }), asyncHandler(byProduct));
reportsRouter.get('/by-factory-month', validate({ query: ReportQueryZ }), asyncHandler(byFactoryMonth));

module.exports = { reportsRouter };

