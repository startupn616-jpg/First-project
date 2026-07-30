const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getSurveyNumbersHandler,
  getSubDivisionsHandler,
  getSurveyDetailsHandler,
  getPattaDetailsHandler,
  resolveSurveyAtPointHandler,
} = require('../controllers/tamilNilamController');

// All routes require officer login
router.use(authMiddleware);

router.get('/survey-numbers', getSurveyNumbersHandler);
router.get('/sub-divisions',  getSubDivisionsHandler);
router.get('/details',        getSurveyDetailsHandler);
router.get('/patta',          getPattaDetailsHandler);
router.get('/at-point',       resolveSurveyAtPointHandler);

module.exports = router;
