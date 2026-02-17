# ⚡ 快速部署清单

按照这个清单，30分钟内完成云端部署！

## ✅ 准备工作（5分钟）

- [ ] 注册 GitHub 账号：https://github.com
- [ ] 注册 MongoDB Atlas：https://www.mongodb.com/cloud/atlas/register  
- [ ] 注册 Render：https://render.com
- [ ] 注册 Vercel：https://vercel.com

💡 **小技巧**：所有平台都支持用 GitHub 账号登录，一键注册！

---

## 📤 第一步：上传代码到 GitHub（5分钟）

```powershell
# 在项目目录执行
cd d:\Coding\Cursor\projects

git init
git add .
git commit -m "Initial commit"

# 在 GitHub 创建仓库后，替换下面的 URL
git remote add origin https://github.com/您的用户名/factory-orders-system.git
git branch -M main
git push -u origin main
```

---

## 🗄️ 第二步：创建 MongoDB 数据库（5分钟）

1. 登录 MongoDB Atlas
2. 创建 **FREE** 集群（M0）
3. 创建数据库用户（记住密码！）
4. 设置 IP 白名单：**0.0.0.0/0**
5. 获取连接字符串：
   ```
   mongodb+srv://admin:密码@xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. ⚠️ **保存好这个连接字符串！**

---

## 🖥️ 第三步：部署后端到 Render（10分钟）

1. 登录 Render → New + → Web Service
2. 连接 GitHub 仓库
3. 配置：
   - Name: `factory-orders-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 添加环境变量：
   - `MONGODB_URI` = 您的 MongoDB 连接字符串
   - `PORT` = `4000`
   - `CORS_ORIGIN` = `*`
5. 选择 **Free** 计划
6. 点击 **Create Web Service**
7. ⚠️ **等待部署完成，保存后端地址！**
   - 格式：https://factory-orders-backend.onrender.com

---

## 🌐 第四步：部署前端到 Vercel（10分钟）

1. 登录 Vercel → Add New → Project
2. Import GitHub 仓库
3. 配置：
   - Framework: `Vite`
   - Root Directory: `frontend`
4. 添加环境变量：
   - `VITE_API_URL` = 您的 Render 后端地址
5. 点击 **Deploy**
6. ⚠️ **等待部署完成，这就是您的访问地址！**
   - 格式：https://factory-orders-system.vercel.app

---

## 🎉 完成！

### 您的系统地址：
```
https://您的项目名.vercel.app
```

### 📱 分享给同事
把这个网址发给同事，大家就能一起用了！

---

## 🔍 验证部署

1. 访问前端地址
2. 进入"工厂管理"
3. 尝试添加一个工厂
4. 如果成功，说明前后端和数据库都连接正常！✅

---

## ⚠️ 常见问题

### Q: 前端显示"请求失败"
**A:** 等待30秒，Render 免费版首次启动需要时间。

### Q: 数据库连接失败
**A:** 检查：
1. MongoDB Atlas 的 IP 白名单是否设置为 0.0.0.0/0
2. 连接字符串中的密码是否正确
3. Render 的环境变量 `MONGODB_URI` 是否正确设置

### Q: 修改代码后如何更新？
**A:** 
```powershell
git add .
git commit -m "更新说明"
git push
```
推送后，Vercel 和 Render 会自动重新部署！

---

## 📞 需要帮助？

遇到问题请查看详细文档：[DEPLOYMENT.md](./DEPLOYMENT.md)
