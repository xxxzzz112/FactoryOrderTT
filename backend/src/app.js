const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { env } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const { ordersRouter } = require('./routes/orders');
const { shipmentsRouter } = require('./routes/shipments');
const { shipmentsGeneralRouter } = require('./routes/shipmentsGeneral');
const { reportsRouter } = require('./routes/reports');
const { exportsRouter } = require('./routes/exports');
const { importRouter } = require('./routes/import');
const { productsRouter } = require('./routes/products');
const productFactorySpecsRouter = require('./routes/productFactorySpecs');
const { factoriesRouter } = require('./routes/factories');
const { historyRouter } = require('./routes/history');
const { inventoryRouter } = require('./routes/inventory');
const { uploadRouter } = require('./routes/upload');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  // 静态文件服务：让前端可以访问上传的图片
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use('/api/orders', ordersRouter);
  app.use('/api/shipments', shipmentsRouter);
  app.use('/api/shipments-general', shipmentsGeneralRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/exports', exportsRouter);
  app.use('/api/import', importRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/product-factory-specs', productFactorySpecsRouter);
  app.use('/api/factories', factoriesRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/upload', uploadRouter);

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

