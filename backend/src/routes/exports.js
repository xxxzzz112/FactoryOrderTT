const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { exportOrdersExcel, exportOverviewPdf } = require('../controllers/exportsController');

const exportsRouter = express.Router();

const ExportQueryZ = z.object({
  factoryName: z.string().optional(),
  status: z.enum(['未生产', '生产中', '部分发货', '已完成']).optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

// 导出符合筛选条件的订单明细 Excel
exportsRouter.get('/orders.xlsx', validate({ query: ExportQueryZ }), asyncHandler(exportOrdersExcel));

// 导出整体概览 PDF
exportsRouter.get('/overview.pdf', validate({ query: ExportQueryZ }), asyncHandler(exportOverviewPdf));

module.exports = { exportsRouter };


