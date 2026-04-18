const express = require('express');
const router = express.Router();
const { getDistricts, getTaluks, getVillages } = require('../controllers/locationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/districts', authMiddleware, getDistricts);
router.get('/taluks', authMiddleware, getTaluks);
router.get('/villages', authMiddleware, getVillages);

module.exports = router;
