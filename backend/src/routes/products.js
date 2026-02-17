const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listProducts, createProduct, getProduct, updateProduct, deleteProduct } = require('../controllers/productsController');

const productsRouter = express.Router();

const ProductCreateZ = z.object({
  sku: z.string().min(1),
  productName: z.string().min(1),
  brand: z.string().optional().default(''),
  color: z.string().optional().default(''),
  size: z.string().optional().default(''),
  unitPrice: z.number().min(0),
  category: z.string().optional().default(''),
  imageUrl: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const ProductPatchZ = ProductCreateZ.partial();

const ProductsQueryZ = z.object({
  keyword: z.string().optional(),
  isActive: z.string().optional()
});

productsRouter.get('/', validate({ query: ProductsQueryZ }), asyncHandler(listProducts));
productsRouter.post('/', validate({ body: ProductCreateZ }), asyncHandler(createProduct));
productsRouter.get('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(getProduct));
productsRouter.patch(
  '/:id',
  validate({ params: z.object({ id: z.string().min(1) }), body: ProductPatchZ }),
  asyncHandler(updateProduct)
);
productsRouter.delete('/:id', validate({ params: z.object({ id: z.string().min(1) }) }), asyncHandler(deleteProduct));

module.exports = { productsRouter };
