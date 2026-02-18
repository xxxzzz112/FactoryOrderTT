const XLSX = require('xlsx');
const { FactoryOrder } = require('../models/FactoryOrder');
const { Product } = require('../models/Product');
const { ProductFactorySpec } = require('../models/ProductFactorySpec');
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

// 批量导入产品：Excel 表头要求（一个SKU一行，横向展开3个工厂）
// sku / SKU, productName / 产品名称, brand / 品牌, shop / 店铺, category / 类目, 
// asin / ASIN, parentAsin / 父ASIN, fnsku / FNSKU,
// color / 颜色, size / 尺寸,
// innerBoxLength / 内箱长, innerBoxWidth / 内箱宽, innerBoxHeight / 内箱高, innerBoxWeight / 内箱重,
// factory1 / 工厂1, unitPrice1 / 单价1, outerBoxLength1 / 外箱长1, outerBoxWidth1 / 外箱宽1, outerBoxHeight1 / 外箱高1, pcsPerCarton1 / 装箱数1,
// factory2 / 工厂2, unitPrice2 / 单价2, outerBoxLength2 / 外箱长2, outerBoxWidth2 / 外箱宽2, outerBoxHeight2 / 外箱高2, pcsPerCarton2 / 装箱数2,
// factory3 / 工厂3, unitPrice3 / 单价3, outerBoxLength3 / 外箱长3, outerBoxWidth3 / 外箱宽3, outerBoxHeight3 / 外箱高3, pcsPerCarton3 / 装箱数3,
// notes / 备注

async function importProducts(req, res) {
  if (!req.file) throw new HttpError(400, '请上传 Excel 文件');

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) throw new HttpError(400, 'Excel 内容为空');

  // 表头映射（支持3个工厂横向展开）
  const headerMap = {};
  const sampleRow = rows[0];
  for (const key of Object.keys(sampleRow)) {
    const nk = normalizeHeader(key);
    if (['sku'].includes(nk)) headerMap.sku = key;
    else if (['productname', '产品名称'].includes(nk)) headerMap.productName = key;
    else if (['brand', '品牌'].includes(nk)) headerMap.brand = key;
    else if (['shop', '店铺'].includes(nk)) headerMap.shop = key;
    else if (['category', '类目'].includes(nk)) headerMap.category = key;
    else if (['asin'].includes(nk)) headerMap.asin = key;
    else if (['parentasin', '父asin'].includes(nk)) headerMap.parentAsin = key;
    else if (['fnsku'].includes(nk)) headerMap.fnsku = key;
    else if (['color', '颜色'].includes(nk)) headerMap.color = key;
    else if (['size', '尺寸'].includes(nk)) headerMap.size = key;
    else if (['innerboxlength', '内箱长'].includes(nk)) headerMap.innerBoxLength = key;
    else if (['innerboxwidth', '内箱宽'].includes(nk)) headerMap.innerBoxWidth = key;
    else if (['innerboxheight', '内箱高'].includes(nk)) headerMap.innerBoxHeight = key;
    else if (['innerboxweight', '内箱重', '内箱重量'].includes(nk)) headerMap.innerBoxWeight = key;
    
    // 工厂1
    else if (['factory1', '工厂1'].includes(nk)) headerMap.factory1 = key;
    else if (['unitprice1', '单价1'].includes(nk)) headerMap.unitPrice1 = key;
    else if (['outerboxlength1', '外箱长1'].includes(nk)) headerMap.outerBoxLength1 = key;
    else if (['outerboxwidth1', '外箱宽1'].includes(nk)) headerMap.outerBoxWidth1 = key;
    else if (['outerboxheight1', '外箱高1'].includes(nk)) headerMap.outerBoxHeight1 = key;
    else if (['pcspercarton1', '装箱数1', '单箱装套数1'].includes(nk)) headerMap.pcsPerCarton1 = key;
    
    // 工厂2
    else if (['factory2', '工厂2'].includes(nk)) headerMap.factory2 = key;
    else if (['unitprice2', '单价2'].includes(nk)) headerMap.unitPrice2 = key;
    else if (['outerboxlength2', '外箱长2'].includes(nk)) headerMap.outerBoxLength2 = key;
    else if (['outerboxwidth2', '外箱宽2'].includes(nk)) headerMap.outerBoxWidth2 = key;
    else if (['outerboxheight2', '外箱高2'].includes(nk)) headerMap.outerBoxHeight2 = key;
    else if (['pcspercarton2', '装箱数2', '单箱装套数2'].includes(nk)) headerMap.pcsPerCarton2 = key;
    
    // 工厂3
    else if (['factory3', '工厂3'].includes(nk)) headerMap.factory3 = key;
    else if (['unitprice3', '单价3'].includes(nk)) headerMap.unitPrice3 = key;
    else if (['outerboxlength3', '外箱长3'].includes(nk)) headerMap.outerBoxLength3 = key;
    else if (['outerboxwidth3', '外箱宽3'].includes(nk)) headerMap.outerBoxWidth3 = key;
    else if (['outerboxheight3', '外箱高3'].includes(nk)) headerMap.outerBoxHeight3 = key;
    else if (['pcspercarton3', '装箱数3', '单箱装套数3'].includes(nk)) headerMap.pcsPerCarton3 = key;
    
    else if (['notes', '备注'].includes(nk)) headerMap.notes = key;
  }

  const required = ['sku', 'productName', 'unitPrice'];
  for (const r of required) {
    if (!headerMap[r]) {
      throw new HttpError(400, `缺少必需列：${r}（或对应的中文列名）`);
    }
  }

  const results = { created: 0, updated: 0, specsCreated: 0, specsUpdated: 0, errors: [] };
  
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sku = String(r[headerMap.sku] || '').trim();
    const productName = String(r[headerMap.productName] || '').trim();

    if (!sku || !productName) {
      results.errors.push(`第${i + 2}行：SKU或产品名称无效`);
      continue;
    }

    const productData = {
      sku,
      productName,
      brand: headerMap.brand ? String(r[headerMap.brand] || '') : '',
      shop: headerMap.shop ? String(r[headerMap.shop] || '') : '',
      category: headerMap.category ? String(r[headerMap.category] || '') : '',
      asin: headerMap.asin ? String(r[headerMap.asin] || '') : '',
      parentAsin: headerMap.parentAsin ? String(r[headerMap.parentAsin] || '') : '',
      fnsku: headerMap.fnsku ? String(r[headerMap.fnsku] || '') : '',
      color: headerMap.color ? String(r[headerMap.color] || '') : '',
      size: headerMap.size ? String(r[headerMap.size] || '') : '',
      innerBoxLength: headerMap.innerBoxLength ? Number(r[headerMap.innerBoxLength] || 0) : 0,
      innerBoxWidth: headerMap.innerBoxWidth ? Number(r[headerMap.innerBoxWidth] || 0) : 0,
      innerBoxHeight: headerMap.innerBoxHeight ? Number(r[headerMap.innerBoxHeight] || 0) : 0,
      innerBoxWeight: headerMap.innerBoxWeight ? Number(r[headerMap.innerBoxWeight] || 0) : 0,
      notes: headerMap.notes ? String(r[headerMap.notes] || '') : ''
    };

    try {
      // 导入产品
      const existing = await Product.findOne({ sku });
      if (existing) {
        await Product.findOneAndUpdate({ sku }, productData);
        results.updated++;
      } else {
        await Product.create(productData);
        results.created++;
      }

      // 导入工厂规格（支持3个工厂）
      for (let factoryIdx = 1; factoryIdx <= 3; factoryIdx++) {
        const factoryKey = `factory${factoryIdx}`;
        const priceKey = `unitPrice${factoryIdx}`;
        const lengthKey = `outerBoxLength${factoryIdx}`;
        const widthKey = `outerBoxWidth${factoryIdx}`;
        const heightKey = `outerBoxHeight${factoryIdx}`;
        const pcsKey = `pcsPerCarton${factoryIdx}`;

        const factoryName = headerMap[factoryKey] ? String(r[headerMap[factoryKey]] || '').trim() : '';
        
        const hasData = 
          (headerMap[priceKey] && Number(r[headerMap[priceKey]] || 0) > 0) ||
          (headerMap[lengthKey] && Number(r[headerMap[lengthKey]] || 0) > 0) ||
          (headerMap[widthKey] && Number(r[headerMap[widthKey]] || 0) > 0) ||
          (headerMap[heightKey] && Number(r[headerMap[heightKey]] || 0) > 0) ||
          (headerMap[pcsKey] && Number(r[headerMap[pcsKey]] || 0) > 0);

        if (factoryName && hasData) {
          const specData = {
            sku,
            factoryName,
            unitPrice: headerMap[priceKey] ? Number(r[headerMap[priceKey]] || 0) : 0,
            outerBoxLength: headerMap[lengthKey] ? Number(r[headerMap[lengthKey]] || 0) : 0,
            outerBoxWidth: headerMap[widthKey] ? Number(r[headerMap[widthKey]] || 0) : 0,
            outerBoxHeight: headerMap[heightKey] ? Number(r[headerMap[heightKey]] || 0) : 0,
            pcsPerCarton: headerMap[pcsKey] ? Number(r[headerMap[pcsKey]] || 0) : 0,
            notes: ''
          };

          const existingSpec = await ProductFactorySpec.findOne({ sku, factoryName });
          if (existingSpec) {
            await ProductFactorySpec.findOneAndUpdate({ sku, factoryName }, specData);
            results.specsUpdated++;
          } else {
            await ProductFactorySpec.create(specData);
            results.specsCreated++;
          }
        }
      }
    } catch (err) {
      results.errors.push(`第${i + 2}行 SKU=${sku}：${err.message}`);
    }
  }

  res.json(results);
}

module.exports = { importOrders, importProducts };

