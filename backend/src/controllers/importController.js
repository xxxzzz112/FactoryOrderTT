const XLSX = require('xlsx');
const { FactoryOrder } = require('../models/FactoryOrder');
const { Product } = require('../models/Product');
const { writeAudit } = require('../services/audit');
const { HttpError } = require('../utils/httpError');

// 批量导入订单示例：Excel 表头要求如下（中文或英文均可识别几种常见写法）：
// factoryName / 工厂, deliveryDate / 交货日期, sku / SKU, productName / 产品名称,
// color / 颜色, size / 尺寸, quantity / 数量, unitPrice / 单价, notes / 备注

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

async function importOrders(req, res) {
  if (!req.file) throw new HttpError(400, '请上传 Excel 文件');

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) throw new HttpError(400, 'Excel 内容为空');

  // 做一层 header 映射
  const headerMap = {};
  const sampleRow = rows[0];
  for (const key of Object.keys(sampleRow)) {
    const nk = normalizeHeader(key);
    if (['factoryname', '工厂'].includes(nk)) headerMap.factoryName = key;
    else if (['deliverydate', '交货日期'].includes(nk)) headerMap.deliveryDate = key;
    else if (['sku'].includes(nk)) headerMap.sku = key;
    else if (['productname', '产品名称'].includes(nk)) headerMap.productName = key;
    else if (['color', '颜色'].includes(nk)) headerMap.color = key;
    else if (['size', '尺寸'].includes(nk)) headerMap.size = key;
    else if (['quantity', '数量'].includes(nk)) headerMap.quantity = key;
    else if (['unitprice', '单价'].includes(nk)) headerMap.unitPrice = key;
    else if (['notes', '备注'].includes(nk)) headerMap.notes = key;
  }

  const required = ['factoryName', 'deliveryDate', 'sku', 'productName', 'quantity', 'unitPrice'];
  for (const r of required) {
    if (!headerMap[r]) {
      throw new HttpError(400, `缺少必需列：${r}（或对应的中文列名）`);
    }
  }

  // 简化起见：每一行视为一个独立订单（一个 SKU）
  const docs = [];
  for (const r of rows) {
    const factoryName = r[headerMap.factoryName];
    const deliveryDateRaw = r[headerMap.deliveryDate];
    const sku = r[headerMap.sku];
    const productName = r[headerMap.productName];
    const color = headerMap.color ? r[headerMap.color] : '';
    const size = headerMap.size ? r[headerMap.size] : '';
    const quantity = Number(r[headerMap.quantity] ?? 0);
    const unitPrice = Number(r[headerMap.unitPrice] ?? 0);
    const notes = headerMap.notes ? r[headerMap.notes] : '';

    if (!factoryName || !deliveryDateRaw || !sku || !productName) continue;

    const deliveryDate = new Date(deliveryDateRaw);
    if (Number.isNaN(deliveryDate.getTime())) continue;

    docs.push({
      factoryName: String(factoryName),
      deliveryDate,
      status: '未生产',
      items: [
        {
          sku: String(sku),
          productName: String(productName),
          color: String(color ?? ''),
          size: String(size ?? ''),
          quantity,
          unitPrice
        }
      ],
      notes: String(notes ?? '')
    });
  }

  if (docs.length === 0) throw new HttpError(400, '解析后没有有效数据行');

  const created = await FactoryOrder.insertMany(docs);
  for (const o of created) {
    // 异步写日志
    void writeAudit({
      action: 'order.import',
      entityType: 'order',
      entityId: o._id,
      summary: `批量导入订单 ${o.factoryName}`
    });
  }

  res.json({ imported: created.length });
}

// 批量导入产品：Excel 表头要求
// sku / SKU, productName / 产品名称, brand / 品牌, category / 类目, 
// color / 颜色, size / 尺寸, unitPrice / 单价,
// innerBoxLength / 内箱长, innerBoxWidth / 内箱宽, innerBoxHeight / 内箱高,
// notes / 备注

async function importProducts(req, res) {
  if (!req.file) throw new HttpError(400, '请上传 Excel 文件');

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) throw new HttpError(400, 'Excel 内容为空');

  // 表头映射
  const headerMap = {};
  const sampleRow = rows[0];
  for (const key of Object.keys(sampleRow)) {
    const nk = normalizeHeader(key);
    if (['sku'].includes(nk)) headerMap.sku = key;
    else if (['productname', '产品名称'].includes(nk)) headerMap.productName = key;
    else if (['brand', '品牌'].includes(nk)) headerMap.brand = key;
    else if (['category', '类目'].includes(nk)) headerMap.category = key;
    else if (['color', '颜色'].includes(nk)) headerMap.color = key;
    else if (['size', '尺寸'].includes(nk)) headerMap.size = key;
    else if (['unitprice', '单价'].includes(nk)) headerMap.unitPrice = key;
    else if (['innerboxlength', '内箱长'].includes(nk)) headerMap.innerBoxLength = key;
    else if (['innerboxwidth', '内箱宽'].includes(nk)) headerMap.innerBoxWidth = key;
    else if (['innerboxheight', '内箱高'].includes(nk)) headerMap.innerBoxHeight = key;
    else if (['notes', '备注'].includes(nk)) headerMap.notes = key;
  }

  const required = ['sku', 'productName', 'unitPrice'];
  for (const r of required) {
    if (!headerMap[r]) {
      throw new HttpError(400, `缺少必需列：${r}（或对应的中文列名）`);
    }
  }

  const results = { created: 0, updated: 0, errors: [] };
  
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sku = String(r[headerMap.sku] || '').trim();
    const productName = String(r[headerMap.productName] || '').trim();
    const unitPrice = Number(r[headerMap.unitPrice] ?? 0);

    if (!sku || !productName || unitPrice < 0) {
      results.errors.push(`第${i + 2}行：SKU、产品名称或单价无效`);
      continue;
    }

    const productData = {
      sku,
      productName,
      brand: headerMap.brand ? String(r[headerMap.brand] || '') : '',
      category: headerMap.category ? String(r[headerMap.category] || '') : '',
      color: headerMap.color ? String(r[headerMap.color] || '') : '',
      size: headerMap.size ? String(r[headerMap.size] || '') : '',
      unitPrice,
      innerBoxLength: headerMap.innerBoxLength ? Number(r[headerMap.innerBoxLength] || 0) : 0,
      innerBoxWidth: headerMap.innerBoxWidth ? Number(r[headerMap.innerBoxWidth] || 0) : 0,
      innerBoxHeight: headerMap.innerBoxHeight ? Number(r[headerMap.innerBoxHeight] || 0) : 0,
      notes: headerMap.notes ? String(r[headerMap.notes] || '') : ''
    };

    try {
      const existing = await Product.findOne({ sku });
      if (existing) {
        await Product.findOneAndUpdate({ sku }, productData);
        results.updated++;
      } else {
        await Product.create(productData);
        results.created++;
      }
    } catch (err) {
      results.errors.push(`第${i + 2}行 SKU=${sku}：${err.message}`);
    }
  }

  res.json(results);
}

module.exports = { importOrders, importProducts };

