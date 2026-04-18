// ============================================================
// Drone Routes — AILAND Tamil Nadu
// All routes require JWT authentication.
// ============================================================

const express = require('express');
const router  = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  startSession,
  updatePosition,
  getActiveSessions,
  getPositionHistory,
  stopSession,
} = require('../controllers/droneController');

// Apply auth middleware to every drone route
router.use(authMiddleware);

// POST /api/drone/start        — begin a new flight session
router.post('/start',    startSession);

// POST /api/drone/position     — push a GPS position to an active session
router.post('/position', updatePosition);

// GET  /api/drone/active       — list all active sessions with latest position
router.get('/active',    getActiveSessions);

// GET  /api/drone/positions/:sessionId — full position history for a session
router.get('/positions/:sessionId', getPositionHistory);

// POST /api/drone/stop         — stop (deactivate) a session
router.post('/stop',     stopSession);

module.exports = router;
