const XLSX = require('xlsx');
const { FactoryOrder } = require('../models/FactoryOrder');
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

module.exports = { importOrders };

