const XLSX = require('./backend/node_modules/xlsx');
const path = require('path');

// 读取源文件
const sourceFile = path.join(__dirname, '产品信息源文件.xlsx');
const wb = XLSX.readFile(sourceFile);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const sourceData = XLSX.utils.sheet_to_json(sheet);

console.log(`读取到 ${sourceData.length} 条数据`);
console.log('示例列名:', Object.keys(sourceData[0] || {}));

// 筛选和转换数据
const outputData = [];
let filtered = 0;
let amazonFound = 0;

for (const row of sourceData) {
  // 筛选条件1: 商品状态 = 上架
  if (row['商品状态'] !== '上架') {
    filtered++;
    continue;
  }

  // 筛选条件2: SKU不以Amazon.Found开头
  const sku = String(row['SKU'] || '').trim();
  if (sku.startsWith('Amazon.Found')) {
    amazonFound++;
    continue;
  }

  // 转换为我们的格式
  const newRow = {
    'SKU': sku,
    '产品名称': row['商品名称'] || '',
    '品牌': row['品牌'] || '',
    '店铺': row['店铺'] || '',
    '类目': row['类目'] || '',
    'ASIN': row['ASIN'] || '',
    '父ASIN': row['父ASIN'] || '',
    'FNSKU': row['FNSKU'] || '',
    '颜色': row['颜色'] || '',
    '尺寸': row['尺寸'] || '',
    '内箱长': row['内箱长'] || '',
    '内箱宽': row['内箱宽'] || '',
    '内箱高': row['内箱高'] || '',
    '内箱重': row['内箱重'] || '',
    '工厂1': '',
    '单价1': '',
    '外箱长1': '',
    '外箱宽1': '',
    '外箱高1': '',
    '装箱数1': '',
    '工厂2': '',
    '单价2': '',
    '外箱长2': '',
    '外箱宽2': '',
    '外箱高2': '',
    '装箱数2': '',
    '工厂3': '',
    '单价3': '',
    '外箱长3': '',
    '外箱宽3': '',
    '外箱高3': '',
    '装箱数3': '',
    '备注': row['备注'] || ''
  };

  outputData.push(newRow);
}

console.log(`\n筛选结果:`);
console.log(`- 商品状态非"上架"被过滤: ${filtered} 条`);
console.log(`- Amazon.Found开头被过滤: ${amazonFound} 条`);
console.log(`- 符合条件的产品: ${outputData.length} 条`);

// 生成新Excel
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.json_to_sheet(outputData);
XLSX.utils.book_append_sheet(newWb, newWs, '产品列表');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outputFile = path.join(__dirname, `转换后的产品导入文件_${timestamp}.xlsx`);
XLSX.writeFile(newWb, outputFile);

console.log(`\n✅ 成功生成文件: ${outputFile}`);
console.log(`请检查文件内容，确认无误后即可导入系统！`);
