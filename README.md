# 工厂订单管理系统

一个完整的工厂订单和库存管理系统，支持多人协作使用。

## ✨ 功能特点

### 📦 核心功能
- **订单管理** - 创建和管理工厂生产订单
- **产品管理** - 维护产品目录（SKU、品牌、图片等）
- **工厂管理** - 管理工厂信息和联系方式
- **库存管理** - 实时查看和更新工厂库存
  - 支持批量录入库存
  - 从订单自动初始化
- **发货管理** - 独立的发货系统
  - 从产品库选择发货
  - 自动扣减库存
  - 记录货代和物流信息
- **历史查询** - 工厂订单历史和SKU追踪

### 🎯 特色功能
- ✅ 多人实时协作
- ✅ 数据云端同步
- ✅ 支持产品图片上传
- ✅ 灵活的筛选和搜索
- ✅ 批量操作支持

## 🚀 快速开始

### 本地开发

**前置要求：**
- Node.js 16+
- MongoDB（本地或 Docker）

**步骤：**

1. 启动 MongoDB
2. 安装并启动后端：
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. 安装并启动前端：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. 访问：http://localhost:5173

### 云端部署（多人协作）

详细部署步骤请查看：**[DEPLOYMENT.md](./DEPLOYMENT.md)**

使用免费云服务，让团队成员通过网址访问，共享同一个数据库。

## 📁 项目结构

```
factory-orders-system/
├── backend/           # Node.js + Express 后端
│   ├── src/
│   │   ├── controllers/   # 业务逻辑
│   │   ├── models/        # MongoDB 数据模型
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 服务层
│   │   └── middleware/    # 中间件
│   └── uploads/       # 上传文件存储
├── frontend/          # React + Vite 前端
│   └── src/
│       ├── pages/     # 页面组件
│       └── api.js     # API 调用
└── DEPLOYMENT.md      # 部署指南
```

## 🛠️ 技术栈

### 后端
- Node.js + Express
- MongoDB + Mongoose
- Zod（数据验证）
- Multer（文件上传）
- XLSX + PDFKit（导出功能）

### 前端
- React 18
- Vite
- 原生 CSS

### 部署
- 前端：Vercel
- 后端：Render
- 数据库：MongoDB Atlas

## 📝 业务流程

1. **下订单** → 创建生产订单（不影响库存）
2. **工厂生产** → 手动更新库存数量
3. **发货** → 从库存中发货（自动扣减）

## 🔐 环境变量

### 后端 (.env)
```env
MONGODB_URI=mongodb://localhost:27017/factory-orders
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

### 前端 (.env)
```env
VITE_API_URL=http://localhost:4000
```

## 📄 API 文档

主要 API 端点：

- `GET/POST /api/orders` - 订单管理
- `GET/POST /api/products` - 产品管理
- `GET/POST /api/factories` - 工厂管理
- `GET/POST /api/inventory` - 库存管理
- `GET/POST /api/shipments-general` - 发货管理
- `GET /api/history` - 历史查询
- `POST /api/upload/image` - 图片上传

## 🤝 多人协作

### 方式1：云端部署（推荐）
按照 [DEPLOYMENT.md](./DEPLOYMENT.md) 部署到云端，所有人通过网址访问。

### 方式2：局域网共享
如果团队在同一办公室，可以配置局域网访问。

### 方式3：代码共享
每人在自己电脑上运行，通过 Git 同步代码。

## 📊 数据模型

主要数据表：
- **FactoryOrder** - 工厂订单
- **Product** - 产品目录
- **Factory** - 工厂信息
- **Inventory** - 库存记录
- **ShipmentGeneral** - 发货单
- **AuditLog** - 操作日志

## 🐛 故障排除

### 前端无法连接后端
1. 检查后端是否启动
2. 检查 CORS 配置
3. 检查环境变量 `VITE_API_URL`

### 数据库连接失败
1. 确认 MongoDB 正在运行
2. 检查连接字符串格式
3. 检查 IP 白名单设置（云端）

## 📮 联系方式

如有问题或建议，欢迎提 Issue！

## 📄 License

MIT
