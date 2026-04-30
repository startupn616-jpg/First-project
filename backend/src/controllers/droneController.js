// ============================================================
// Drone Flight Controller — AILAND Tamil Nadu
// In-memory session store (no DB required).
// Sessions auto-expire after 2 hours of inactivity.
// ============================================================

const { v4: uuidv4 } = require('uuid');

// ── In-memory store ───────────────────────────────────────────
// Map<sessionId, {
//   name: string,
//   positions: [{lat, lng, altitude, speed, heading, ts}],
//   isActive: boolean,
//   startedBy: number (user id),
//   startedAt: string (ISO),
//   lastActivityAt: number (Date.now())
// }>
const sessions = new Map();

// Session TTL: 2 hours of inactivity
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

// ── Cleanup helper ────────────────────────────────────────────
const pruneExpiredSessions = () => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
};

// Run cleanup every 15 minutes
setInterval(pruneExpiredSessions, 15 * 60 * 1000).unref();

// ── POST /api/drone/start ─────────────────────────────────────
/**
 * Start a new drone flight session.
 * Body: { name }
 * Returns: { sessionId }
 */
const startSession = async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Session name is required.' });
  }

  const sessionId = uuidv4();
  const now = new Date().toISOString();

  sessions.set(sessionId, {
    name:           name.trim(),
    positions:      [],
    isActive:       true,
    startedBy:      req.user.id,
    startedAt:      now,
    lastActivityAt: Date.now(),
  });

  console.log(`[Drone] Session started: ${sessionId} by user ${req.user.id} — "${name.trim()}"`);

  return res.json({
    success:   true,
    sessionId,
    name:      name.trim(),
    startedAt: now,
  });
};

// ── POST /api/drone/position ──────────────────────────────────
/**
 * Record a new GPS position for an active session.
 * Body: { sessionId, lat, lng, altitude?, speed?, heading? }
 */
const updatePosition = async (req, res) => {
  const { sessionId, lat, lng, altitude, speed, heading } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'sessionId is required.' });
  }
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return res.status(400).json({ success: false, message: 'lat and lng are required.' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found or expired.' });
  }
  if (!session.isActive) {
    return res.status(400).json({ success: false, message: 'Session has been stopped.' });
  }

  const position = {
    lat:      parseFloat(lat),
    lng:      parseFloat(lng),
    altitude: altitude !== undefined ? parseFloat(altitude) : null,
    speed:    speed    !== undefined ? parseFloat(speed)    : null,
    heading:  heading  !== undefined ? parseFloat(heading)  : null,
    ts:       new Date().toISOString(),
  };

  session.positions.push(position);
  session.lastActivityAt = Date.now();

  return res.json({
    success:        true,
    sessionId,
    positionCount:  session.positions.length,
    latest:         position,
  });
};

// ── GET /api/drone/active ─────────────────────────────────────
/**
 * Return all active sessions with their latest position.
 */
const getActiveSessions = async (req, res) => {
  const active = [];
  for (const [id, session] of sessions.entries()) {
    if (!session.isActive) continue;
    const latest = session.positions.length
      ? session.positions[session.positions.length - 1]
      : null;

    active.push({
      sessionId:     id,
      name:          session.name,
      startedBy:     session.startedBy,
      startedAt:     session.startedAt,
      positionCount: session.positions.length,
      latestPosition: latest,
    });
  }

  return res.json({
    success: true,
    count:   active.length,
    data:    active,
  });
};

// ── GET /api/drone/positions/:sessionId ──────────────────────
/**
 * Return the full position history for a session.
 */
const getPositionHistory = async (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found or expired.' });
  }

  return res.json({
    success:      true,
    sessionId,
    name:         session.name,
    isActive:     session.isActive,
    startedBy:    session.startedBy,
    startedAt:    session.startedAt,
    totalPoints:  session.positions.length,
    positions:    session.positions,
  });
};

// ── POST /api/drone/stop ──────────────────────────────────────
/**
 * Mark a session as stopped.
 * Body: { sessionId }
 */
const stopSession = async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'sessionId is required.' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found or expired.' });
  }

  session.isActive       = false;
  session.stoppedAt      = new Date().toISOString();
  session.lastActivityAt = Date.now();

  console.log(`[Drone] Session stopped: ${sessionId} — ${session.positions.length} positions recorded`);

  return res.json({
    success:       true,
    sessionId,
    name:          session.name,
    stoppedAt:     session.stoppedAt,
    totalPositions: session.positions.length,
  });
};

// ── GET /api/drone/track/:sessionId (PUBLIC — no auth) ───────
/**
 * Public shareable tracking endpoint.
 * Returns session info + latest position + last 100 trail points.
 * Used by the /track/:sessionId live-tracking page (no login needed).
 */
const getPublicTrack = (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found or has expired.' });
  }

  const latest = session.positions.length
    ? session.positions[session.positions.length - 1]
    : null;

  return res.json({
    success:       true,
    sessionId,
    name:          session.name,
    isActive:      session.isActive,
    startedAt:     session.startedAt,
    stoppedAt:     session.stoppedAt || null,
    totalPoints:   session.positions.length,
    latestPosition: latest,
    trail:         session.positions.slice(-100),
  });
};

module.exports = {
  startSession,
  updatePosition,
  getActiveSessions,
  getPositionHistory,
  stopSession,
  getPublicTrack,
};
