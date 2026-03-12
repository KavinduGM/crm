/**
 * Unified Lead Capture Endpoint (Phase 2)
 * POST /api/leads/new
 * Runs the full 3-layer processing pipeline.
 */
const { pool } = require('../config/db');
const { processLead } = require('../services/pipeline');
const { verifyCaptcha } = require('../services/captcha');

const RATE_LIMIT_MAP = new Map(); // IP → { count, firstRequest }
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now - entry.firstRequest > RATE_WINDOW_MS) {
    RATE_LIMIT_MAP.set(ip, { count: 1, firstRequest: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

async function submitLead(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const sourceUrl = req.headers.referer || req.body.source || '';

  try {
    const {
      name, email, phone, message, location, service,
      form_id, business_id,
      answers,
      captchaId, captchaAnswer,
      honeypot, // hidden field — should always be empty for real users
    } = req.body;

    // ── Honeypot check
    if (honeypot && honeypot.trim() !== '') {
      await logSpamAttempt(ip, form_id, business_id, 'honeypot', req.body, req.headers['user-agent']);
      // Return 200 to fool bots
      return res.status(200).json({ success: true, message: 'Form submitted successfully' });
    }

    // ── Rate limiting
    if (!checkRateLimit(ip)) {
      await logSpamAttempt(ip, form_id, business_id, 'rate_limit', req.body, req.headers['user-agent']);
      return res.status(429).json({ success: false, message: 'Too many requests. Please wait a few minutes.' });
    }

    // ── CAPTCHA verification (only for standard forms — AI forms have session-based protection)
    if (captchaId) {
      const captchaResult = await verifyCaptcha(captchaId, captchaAnswer);
      if (!captchaResult.valid) {
        await logSpamAttempt(ip, form_id, business_id, 'captcha_fail', req.body, req.headers['user-agent']);
        return res.status(400).json({ success: false, message: 'Captcha verification failed. Please try again.' });
      }
    }

    // ── Resolve business ID from form_id if not provided
    let resolvedBusinessId = business_id;
    let resolvedFormId = form_id;
    if (!resolvedBusinessId && form_id) {
      const [formRows] = await pool.query('SELECT business_id FROM contact_forms WHERE id = ?', [form_id]);
      if (formRows.length) resolvedBusinessId = formRows[0].business_id;
    }

    if (!resolvedBusinessId) {
      return res.status(400).json({ success: false, message: 'form_id or business_id is required' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    // Build normalized lead object
    const lead = {
      name: name || '',
      email: email.toLowerCase().trim(),
      phone: phone || '',
      message: message || '',
      location: location || '',
      service: service || '',
      answers: answers || (message ? [{ question: 'Message', answer: message }] : []),
      honeypot: honeypot || '',
    };

    // Run the 3-layer pipeline
    const result = await processLead(lead, {
      formId: resolvedFormId,
      businessId: resolvedBusinessId,
      sourceUrl,
      ipAddress: ip,
    });

    res.status(201).json({
      success: true,
      message: 'Form submitted successfully',
      // Don't expose pipeline internals to client
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    res.status(500).json({ success: false, message: 'Submission failed. Please try again.' });
  }
}

async function logSpamAttempt(ip, formId, businessId, reason, payload, userAgent) {
  try {
    await pool.query(
      'INSERT INTO spam_logs (ip_address, form_id, business_id, reason, payload, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [ip, formId || null, businessId || null, reason, JSON.stringify(payload), userAgent || '']
    );
  } catch { /* non-fatal */ }
}

module.exports = { submitLead };
