const { Factory } = require('../models/Factory');
const { HttpError } = require('../utils/httpError');

async function listFactories(req, res) {
  const q = req.validated.query;
  const filter = {};
  if (q.keyword) {
    const re = new RegExp(q.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.name = re;
  }
  if (q.isActive !== undefined) filter.isActive = q.isActive === 'true';

  const data = await Factory.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({ data });
}

async function createFactory(req, res) {
  const body = req.validated.body;
  const exists = await Factory.findOne({ name: body.name });
  if (exists) throw new HttpError(400, `工厂名称 "${body.name}" 已存在`);
  const factory = await Factory.create(body);
  res.status(201).json(factory);
}

async function getFactory(req, res) {
  const { id } = req.validated.params;
  const factory = await Factory.findById(id).lean();
  if (!factory) throw new HttpError(404, '工厂不存在');
  res.json(factory);
}

async function updateFactory(req, res) {
  const { id } = req.validated.params;
  const patch = req.validated.body;
  const factory = await Factory.findById(id);
  if (!factory) throw new HttpError(404, '工厂不存在');

  if (patch.name != null && patch.name !== factory.name) {
    const dup = await Factory.findOne({ name: patch.name, _id: { $ne: id } });
    if (dup) throw new HttpError(400, `工厂名称 "${patch.name}" 已被其他工厂使用`);
  }

  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) factory[k] = v;
  }
  await factory.save();
  res.json(factory);
}

async function deleteFactory(req, res) {
  const { id } = req.validated.params;
  const factory = await Factory.findById(id);
  if (!factory) throw new HttpError(404, '工厂不存在');
  await factory.deleteOne();
  res.json({ ok: true });
}

module.exports = { listFactories, createFactory, getFactory, updateFactory, deleteFactory };
