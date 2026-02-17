# 🚀 部署指南 - 工厂订单管理系统

## 📋 部署方案：免费云服务

- **前端**：Vercel（免费）
- **后端**：Render（免费）
- **数据库**：MongoDB Atlas（免费 512MB）

**完成后效果**：所有人通过网址访问，数据实时共享！

---

## 第一步：准备 GitHub 账号和仓库

### 1.1 注册 GitHub（如果没有）
访问：https://github.com
注册一个免费账号

### 1.2 创建新仓库
1. 登录 GitHub
2. 点击右上角 `+` → `New repository`
3. 填写信息：
   - Repository name: `factory-orders-system`
   - Public（公开）或 Private（私有）都可以
   - 不勾选 "Initialize with README"
4. 点击 `Create repository`

### 1.3 上传代码到 GitHub

在本地项目目录打开终端，执行：

```powershell
cd d:\Coding\Cursor\projects

# 初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit - Factory Orders Management System"

# 连接到您的 GitHub 仓库（替换为您的用户名）
git remote add origin https://github.com/您的用户名/factory-orders-system.git

# 推送代码
git branch -M main
git push -u origin main
```

---

## 第二步：创建 MongoDB Atlas 免费数据库

### 2.1 注册 MongoDB Atlas
访问：https://www.mongodb.com/cloud/atlas/register
使用 Google 账号注册最快

### 2.2 创建免费集群
1. 登录后，选择 **"Create a Deployment"**
2. 选择 **FREE** 计划（M0 Sandbox - 512MB）
3. 选择云服务商和区域（推荐：AWS - Singapore 或 Hong Kong）
4. Cluster Name: `factory-orders`
5. 点击 **"Create Deployment"**

### 2.3 创建数据库用户
1. 会弹出创建用户窗口
2. Username: `admin`
3. Password: **记住这个密码！**（或点击 Autogenerate）
4. 点击 **"Create Database User"**

### 2.4 设置网络访问
1. 会提示设置 IP 访问
2. 选择 **"Allow Access from Anywhere"** (0.0.0.0/0)
3. 点击 **"Add Entry"**

### 2.5 获取连接字符串
1. 点击 **"Connect"**
2. 选择 **"Connect your application"**
3. Driver 选择 **Node.js**
4. 复制连接字符串，格式类似：
   ```
   mongodb+srv://admin:<password>@factory-orders.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **将 `<password>` 替换为您刚才设置的密码**
6. **保存这个完整的连接字符串！**

---

## 第三步：部署后端到 Render

### 3.1 注册 Render
访问：https://render.com
使用 GitHub 账号登录（最方便）

### 3.2 创建新的 Web Service
1. 点击 **"New +"** → **"Web Service"**
2. 连接您的 GitHub 仓库：`factory-orders-system`
3. 填写配置：

**Basic Settings:**
- Name: `factory-orders-backend`
- Region: `Singapore` 或 `Hong Kong`（离您近的）
- Branch: `main`
- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

**Advanced Settings - Environment Variables:**
点击 **"Add Environment Variable"** 添加：

| Key | Value |
|-----|-------|
| `MONGODB_URI` | 您的 MongoDB Atlas 连接字符串 |
| `PORT` | `4000` |
| `CORS_ORIGIN` | `*` |

4. Plan: 选择 **Free**
5. 点击 **"Create Web Service"**

### 3.3 等待部署完成
- 大约需要 3-5 分钟
- 部署完成后，会显示您的后端地址，类似：
  ```
  https://factory-orders-backend.onrender.com
  ```
- **保存这个地址！**

---

## 第四步：部署前端到 Vercel

### 4.1 注册 Vercel
访问：https://vercel.com
使用 GitHub 账号登录

### 4.2 导入项目
1. 点击 **"Add New..."** → **"Project"**
2. 选择您的 GitHub 仓库：`factory-orders-system`
3. 点击 **"Import"**

### 4.3 配置项目
- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### 4.4 添加环境变量
点击 **"Environment Variables"**，添加：

| Name | Value |
|------|-------|
| `VITE_API_URL` | 您的 Render 后端地址（如：https://factory-orders-backend.onrender.com） |

### 4.5 部署
点击 **"Deploy"**

等待 1-2 分钟，部署完成后，会显示您的前端地址，类似：
```
https://factory-orders-system.vercel.app
```

---

## 第五步：配置前端API地址

需要修改前端代码，让它连接到 Render 后端。

### 5.1 修改 frontend/src/api.js

将以下代码：

```javascript
export async function api(path, opts = {}) {
  const url = path;  // 当前使用相对路径
  // ...
}
```

改为：

```javascript
export async function api(path, opts = {}) {
  const baseURL = import.meta.env.VITE_API_URL || '';
  const url = path.startsWith('http') ? path : `${baseURL}${path}`;
  // ...
}
```

### 5.2 重新部署
提交更改并推送到 GitHub：

```powershell
git add .
git commit -m "Add API base URL support"
git push
```

Vercel 会自动重新部署（约 1 分钟）

---

## ✅ 完成！

### 您的系统地址：
- **前端（给同事的访问地址）**：https://您的项目名.vercel.app
- **后端 API**：https://factory-orders-backend.onrender.com

### 📱 分享给同事
直接把前端地址发给同事，所有人都能访问，数据实时同步！

---

## ⚠️ 注意事项

### 免费版限制
- **Render 后端**：15 分钟无访问会自动休眠，首次访问需等待 30 秒唤醒
- **MongoDB Atlas**：512MB 存储空间（够用很久）
- **Vercel 前端**：无限制，速度很快

### 如何唤醒休眠的后端
如果后端休眠了，访问时会显示加载中，等 30 秒就好了。

或者升级到付费版（$7/月）保持常驻。

---

## 🔧 常见问题

### Q1: 部署后前端无法连接后端
**A:** 检查：
1. Vercel 的环境变量 `VITE_API_URL` 是否正确
2. Render 后端是否成功启动（查看 Logs）
3. MongoDB 连接字符串是否正确

### Q2: 数据库连接失败
**A:** 检查：
1. MongoDB Atlas 的 IP 白名单是否设置为 0.0.0.0/0
2. 密码是否正确替换在连接字符串中
3. 连接字符串中的 `<password>` 是否已替换

### Q3: 修改代码后如何更新
**A:** 
```powershell
git add .
git commit -m "Update: 描述您的更改"
git push
```
Vercel 和 Render 会自动重新部署！

---

## 📞 需要帮助？
如果遇到问题，请查看部署平台的 Logs 日志，里面会显示具体错误信息。
