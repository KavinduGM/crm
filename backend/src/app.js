require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { testConnection } = require('./config/db');

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /localhost:\d+/,
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts' },
});
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many form submissions' },
});

app.use(limiter);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (logos etc.)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running', version: '2.0.0', phase: 2 });
});

// ── Phase 1 Routes ──────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/businesses', require('./routes/business.routes'));
app.use('/api/forms', require('./routes/form.routes'));
app.use('/api/leads', require('./routes/lead.routes'));
app.use('/api/public', require('./routes/public.routes'));

// ── Upload Route ────────────────────────────────────────────
app.use('/api/upload', require('./routes/upload.routes'));

// ── Phase 2 Routes ──────────────────────────────────────────
app.use('/api/captcha', require('./routes/captcha.routes'));
app.use('/api/spam', require('./routes/spam.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/admin/settings', require('./routes/settings.routes'));

// Unified lead submission endpoint (Phase 2)
const { submitLead } = require('./controllers/leads_v2.controller');
app.post('/api/leads/new', formLimiter, submitLead);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Auto-migrate: ensure system_settings table exists
async function runMigrations() {
  const { pool } = require('./config/db');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value)
      VALUES ('claude_api_key', NULL)
    `);
    console.log('✅ Migrations applied (system_settings ready)');
  } catch (err) {
    console.error('⚠️  Migration warning (non-fatal):', err.message);
  }
}

async function startServer() {
  await testConnection();
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`\n🚀 CRM API v2.0 running on http://localhost:${PORT}`);
    console.log(`   Phase 2: AI Pipeline + Spam Protection active`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
