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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
app.use('/api/drone',     droneRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'AILAND Backend',
    version: '1.0.0',
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
