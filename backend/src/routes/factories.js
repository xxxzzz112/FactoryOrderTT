const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listFactories, createFactory, getFactory, updateFactory, deleteFactory } = require('../controllers/factoriesController');

const factoriesRouter = express.Router();

const FactoryCreateZ = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const FactoryPatchZ = FactoryCreateZ.partial();

const FactoriesQueryZ = z.object({
  keyword: z.string().optional(),
  isActive: z.string().optional()
});

factoriesRouter.get('/', validate({ query: FactoriesQueryZ }), asyncHandler(listFactories));
factoriesRouter.post('/', validate({ body: FactoryCreateZ }), asyncHandler(createFactory));
factoriesRouter.get('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(getFactory));
factoriesRouter.patch(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }), body: FactoryPatchZ }),
  asyncHandler(updateFactory)
);
factoriesRouter.delete('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(deleteFactory));

module.exports = { factoriesRouter };
