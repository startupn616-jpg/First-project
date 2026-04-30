// ============================================================
// AILAND Express Server
// Tamil Nadu Agriculture & Land Survey System
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const tamilNilamRoutes = require('./routes/tamilNilamRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const droneRoutes      = require('./routes/droneRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tnland.it.com',
    'https://www.tnland.it.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', locationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tamilnilam', tamilNilamRoutes);
app.use('/api/admin',     adminRoutes);
// Public shareable drone tracking — no JWT needed (before droneRoutes auth)
const { getPublicTrack } = require('./controllers/droneController');
app.get('/api/drone/track/:sessionId', getPublicTrack);

app.use('/api/drone',     droneRoutes);

// Health check — also tests Supabase connectivity
app.get('/api/health', async (_req, res) => {
  const sb = require('./config/supabase');
  const { error } = await sb.from('districts').select('id').limit(1);
  res.json({
    status: error ? 'DB_ERROR' : 'OK',
    app: 'AILAND Backend',
    db: error ? `Supabase error: ${error.message}` : 'Connected',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);

  if (err.message && err.message.includes('Only JPG')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max size is 10MB.' });
  }

  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚜 AILAND Backend running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
