const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getSetting, setSetting, getAllSettings, getClaudeApiKey } = require('../services/settings.service');

/**
 * GET /api/admin/settings
 * Returns all settings (API key is masked for security)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await getAllSettings();

    // Mask the API key — only show last 8 chars
    const masked = settings.map(s => {
      if (s.setting_key === 'claude_api_key' && s.setting_value) {
        const val = s.setting_value;
        return {
          ...s,
          setting_value: '••••••••••••••••' + val.slice(-8),
          has_value: true,
        };
      }
      return { ...s, has_value: Boolean(s.setting_value) };
    });

    // Also report whether the env fallback is active
    const dbKey = await getSetting('claude_api_key');
    const envKey = process.env.CLAUDE_API_KEY;

    res.json({
      success: true,
      data: masked,
      meta: {
        claude_key_source: dbKey ? 'database' : envKey ? 'environment' : 'none',
        claude_key_configured: Boolean(dbKey || envKey),
      },
    });
  } catch (err) {
    console.error('GET settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

/**
 * PUT /api/admin/settings
 * Body: { claude_api_key: "sk-ant-..." }
 * Saves the key to DB so it takes effect immediately without server restart.
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { claude_api_key } = req.body;

    if (claude_api_key !== undefined) {
      const trimmed = (claude_api_key || '').trim();
      // Basic validation
      if (trimmed && !trimmed.startsWith('sk-ant-')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Claude API key format. Must start with "sk-ant-"',
        });
      }
      await setSetting('claude_api_key', trimmed || null);
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    console.error('PUT settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

/**
 * POST /api/admin/settings/test-claude
 * Tests the currently active Claude API key with a simple call.
 */
router.post('/test-claude', authMiddleware, async (req, res) => {
  try {
    const apiKey = await getClaudeApiKey();
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'No Claude API key configured' });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 64,
      messages: [{ role: 'user', content: 'Reply with: {"status":"ok"}' }],
    });

    const text = message.content[0].text.trim();
    res.json({ success: true, message: 'Claude API connection successful', response: text });
  } catch (err) {
    res.status(400).json({ success: false, message: `Claude API test failed: ${err.message}` });
  }
});

module.exports = router;
