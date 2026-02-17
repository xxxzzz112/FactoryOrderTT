const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../middleware/asyncHandler');
const { importOrders } = require('../controllers/importController');

const importRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 批量导入订单（Excel）
importRouter.post('/orders', upload.single('file'), asyncHandler(importOrders));

module.exports = { importRouter };


