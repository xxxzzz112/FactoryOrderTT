const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../middleware/asyncHandler');
const { importOrders, importProducts } = require('../controllers/importController');

const importRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 批量导入订单（Excel）
importRouter.post('/orders', upload.single('file'), asyncHandler(importOrders));

// 批量导入产品（Excel）
importRouter.post('/products', upload.single('file'), asyncHandler(importProducts));

module.exports = { importRouter };


