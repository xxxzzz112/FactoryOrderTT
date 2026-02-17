const path = require('path');
const fs = require('fs');
const { HttpError } = require('../utils/httpError');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// 确保 uploads 目录存在
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function uploadImage(req, res) {
  if (!req.file) throw new HttpError(400, '请上传图片文件');

  // multer 已经把文件存到 uploads/ 目录了，我们只需要返回可访问的 URL
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl, filename: req.file.filename });
}

module.exports = { uploadImage, UPLOADS_DIR };
