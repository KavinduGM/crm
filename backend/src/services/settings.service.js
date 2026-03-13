/**
 * Settings Service
 * Reads/writes system settings from the DB (system_settings table).
 * Falls back to .env for the Claude API key if DB value is not set.
 */
const { pool } = require('../config/db');

async function getSetting(key) {
  try {
    const [rows] = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    if (rows.length && rows[0].setting_value) {
      return rows[0].setting_value;
    }
  } catch (err) {
    console.error(`getSetting(${key}) DB error:`, err.message);
  }
  return null;
}

async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
    [key, value]
  );
}

async function getAllSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value, updated_at FROM system_settings');
  return rows;
}

/**
 * Returns the effective Claude API key:
 *   1. DB value (set by admin UI)
 *   2. .env CLAUDE_API_KEY (fallback)
 */
async function getClaudeApiKey() {
  const dbKey = await getSetting('claude_api_key');
  return dbKey || process.env.CLAUDE_API_KEY || null;
}

module.exports = { getSetting, setSetting, getAllSettings, getClaudeApiKey };
