const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { FactoryOrder } = require('../models/FactoryOrder');
const { buildOrdersMatchFromQuery } = require('../services/orderStats');

async function exportOrdersExcel(req, res) {
  const q = req.validated.query;
  const match = buildOrdersMatchFromQuery(q);

  const orders = await FactoryOrder.find(match).sort({ deliveryDate: -1, createdAt: -1 }).lean();

  const rows = [];
  for (const o of orders) {
    for (const item of o.items) {
      rows.push({
        工厂: o.factoryName,
        交货日期: o.deliveryDate.toISOString().slice(0, 10),
        状态: o.status,
        SKU: item.sku,
        产品名称: item.productName,
        颜色: item.color ?? '',
        尺寸: item.size ?? '',
        数量: item.quantity,
        单价: item.unitPrice,
        金额: item.quantity * item.unitPrice,
        备注: o.notes ?? ''
      });
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '订单明细');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
  res.send(buf);
}

async function exportOverviewPdf(req, res) {
  const q = req.validated.query;
  const match = buildOrdersMatchFromQuery(q);

  const [row] = await FactoryOrder.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'shipments',
        localField: '_id',
        foreignField: 'orderId',
        as: 'shipments'
      }
    },
    {
      $addFields: {
        orderedQuantity: { $sum: '$items.quantity' },
        orderedAmount: {
          $sum: {
            $map: {
              input: '$items',
              as: 'it',
              in: { $multiply: ['$$it.quantity', '$$it.unitPrice'] }
            }
          }
        },
        shippedQuantity: {
          $sum: {
            $map: {
              input: '$shipments',
              as: 's',
              in: { $sum: '$$s.lines.quantity' }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        orderedQuantity: { $sum: '$orderedQuantity' },
        shippedQuantity: { $sum: '$shippedQuantity' },
        orderedAmount: { $sum: '$orderedAmount' }
      }
    }
  ]);

  const summary = row ?? {
    orderCount: 0,
    orderedQuantity: 0,
    shippedQuantity: 0,
    orderedAmount: 0
  };

  const remainingQuantity = Math.max(summary.orderedQuantity - summary.shippedQuantity, 0);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="overview.pdf"');

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text('工厂订单发货概览', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`订单数量：${summary.orderCount}`);
  doc.text(`总下单数量：${summary.orderedQuantity}`);
  doc.text(`已发货数量：${summary.shippedQuantity}`);
  doc.text(`剩余数量：${remainingQuantity}`);
  doc.text(`总下单金额：${summary.orderedAmount.toFixed(2)}`);

  doc.end();
}

module.exports = { exportOrdersExcel, exportOverviewPdf };

