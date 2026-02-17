const express = require('express');
const multer = require('multer');
const path = require('path');
const { asyncHandler } = require('../middleware/asyncHandler');
const { uploadImage, UPLOADS_DIR } = require('../controllers/uploadController');

const uploadRouter = express.Router();

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    cb(null, `${basename}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPEG、PNG、GIF、WEBP 格式的图片'));
    }
  }
});

// 上传单个图片
uploadRouter.post('/image', upload.single('image'), asyncHandler(uploadImage));

module.exports = { uploadRouter };
