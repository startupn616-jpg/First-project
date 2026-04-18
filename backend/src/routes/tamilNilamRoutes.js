const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getSurveyNumbersHandler,
  getSubDivisionsHandler,
  getSurveyDetailsHandler,
  getPattaDetailsHandler,
} = require('../controllers/tamilNilamController');

// All routes require officer login
router.use(authMiddleware);

router.get('/survey-numbers', getSurveyNumbersHandler);
router.get('/sub-divisions',  getSubDivisionsHandler);
router.get('/details',        getSurveyDetailsHandler);
router.get('/patta',          getPattaDetailsHandler);

module.exports = router;
