const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadAndAnalyze, getAnalyses } = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Configure multer for image storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Sanitize filename: timestamp + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `img_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are accepted.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

router.post('/', authMiddleware, upload.single('image'), uploadAndAnalyze);
router.get('/analyses', authMiddleware, getAnalyses);

module.exports = router;
