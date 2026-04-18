const express = require('express');
const router = express.Router();
const { login, getProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/me', authMiddleware, getProfile);

module.exports = router;
