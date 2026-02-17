const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { factoryHistory, skuHistory } = require('../controllers/historyController');

const historyRouter = express.Router();

historyRouter.get(
  '/factory',
  validate({ query: z.object({ factoryName: z.string().min(1) }) }),
  asyncHandler(factoryHistory)
);

historyRouter.get(
  '/sku',
  validate({ query: z.object({ sku: z.string().min(1) }) }),
  asyncHandler(skuHistory)
);

module.exports = { historyRouter };
