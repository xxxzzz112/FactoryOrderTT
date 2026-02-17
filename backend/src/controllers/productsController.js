const { Product } = require('../models/Product');
const { HttpError } = require('../utils/httpError');

async function listProducts(req, res) {
  const q = req.validated.query;
  const filter = {};
  if (q.keyword) {
    const re = new RegExp(q.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ sku: re }, { productName: re }];
  }
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const data = await Product.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({ data });
}

async function createProduct(req, res) {
  const body = req.validated.body;
  const exists = await Product.findOne({ sku: body.sku });
  if (exists) throw new HttpError(400, `SKU "${body.sku}" 已存在`);
  const product = await Product.create(body);
  res.status(201).json(product);
}

async function getProduct(req, res) {
  const { id } = req.validated.params;
  const product = await Product.findById(id).lean();
  if (!product) throw new HttpError(404, '产品不存在');
  res.json(product);
}

async function updateProduct(req, res) {
  const { id } = req.validated.params;
  const patch = req.validated.body;
  const product = await Product.findById(id);
  if (!product) throw new HttpError(404, '产品不存在');

  if (patch.sku != null && patch.sku !== product.sku) {
    const dup = await Product.findOne({ sku: patch.sku, _id: { $ne: id } });
    if (dup) throw new HttpError(400, `SKU "${patch.sku}" 已被其他产品使用`);
  }

  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) product[k] = v;
  }
  await product.save();
  res.json(product);
}

async function deleteProduct(req, res) {
  const { id } = req.validated.params;
  const product = await Product.findById(id);
  if (!product) throw new HttpError(404, '产品不存在');
  await product.deleteOne();
  res.json({ ok: true });
}

module.exports = { listProducts, createProduct, getProduct, updateProduct, deleteProduct };
