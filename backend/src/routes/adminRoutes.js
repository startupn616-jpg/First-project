const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const {
  listLandParcels,
  createLandParcel,
  updateLandParcel,
  deleteLandParcel,
  autoFetchFromTamilNilam,
} = require('../controllers/adminController');

router.use(authMiddleware, adminOnly);

// auto-fetch must be BEFORE /:id to avoid Express treating "auto-fetch" as an id
router.get   ('/land/auto-fetch',  autoFetchFromTamilNilam);
router.get   ('/land',             listLandParcels);
router.post  ('/land',             createLandParcel);
router.put   ('/land/:id',         updateLandParcel);
router.delete('/land/:id',         deleteLandParcel);

module.exports = router;
