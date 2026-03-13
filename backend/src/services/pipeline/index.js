/**
 * Lead Processing Pipeline (Claude AI)
 *
 *   1. Honeypot check  — free, instant. Bots fill hidden fields → instant reject
 *   2. Claude AI call  — classifies (spam / sales_pitch / qualified) + scores
 *   3. Route result    — spam_leads | leads(sales_pitch) | leads(qualified)
 */
const { pool } = require('../../config/db');
const { analyzeWithAI } = require('./aiAnalyzer');

const AUTO_DELETE_SPAM_THRESHOLD = 100;

/**
 * Main pipeline entry point.
 * @param {Object} lead - { name, email, phone, message, answers, honeypot }
 * @param {Object} meta - { formId, businessId, sourceUrl, ipAddress, userAgent }
 */
async function processLead(lead, meta) {
  const { formId, businessId, sourceUrl, ipAddress } = meta;

  // ═══════════════════════════════════════════
  // LAYER 1 — HONEYPOT (free, instant)
  // ═══════════════════════════════════════════
  if (lead.honeypot && lead.honeypot.trim() !== '') {
    const spamId = await storeSpamLead(lead, {
      businessId, formId, sourceUrl, ipAddress,
      spamScore: 100,
      spamReasons: ['honeypot_triggered'],
    });
    return { status: 'spam', spamLeadId: spamId, score: 100, reasons: ['honeypot_triggered'] };
  }

  // ═══════════════════════════════════════════
  // Fetch business + form context for AI
  // ═══════════════════════════════════════════
  let businessContext = {};
  try {
    const [bizRows] = await pool.query(
      'SELECT company_name, industry FROM businesses WHERE id = ?',
      [businessId]
    );
    if (bizRows.length) businessContext = bizRows[0];

    if (formId) {
      const [formRows] = await pool.query(
        'SELECT ai_config FROM contact_forms WHERE id = ?',
        [formId]
      );
      if (formRows.length && formRows[0].ai_config) {
        let aiConfig = formRows[0].ai_config;
        if (typeof aiConfig === 'string') {
          try { aiConfig = JSON.parse(aiConfig); } catch { aiConfig = {}; }
        }
        businessContext.services = aiConfig.services || '';
      }
    }
  } catch { /* non-fatal */ }

  // ═══════════════════════════════════════════
  // LAYER 2 — Claude AI: classify + score
  // ═══════════════════════════════════════════
  const { analysis } = await analyzeWithAI(lead, businessContext);
  const { is_spam, lead_score, reason, priority, lead_score_numeric } = analysis;

  // ── Spam ────────────────────────────────────
  if (is_spam) {
    const spamId = await storeSpamLead(lead, {
      businessId, formId, sourceUrl, ipAddress,
      spamScore: 90,
      spamReasons: [`ai: ${reason || 'flagged by AI'}`],
    });
    await autoDeleteOldestSpam(businessId);
    return {
      status: 'spam',
      spamLeadId: spamId,
      score: 90,
      reasons: [reason],
      detectedBy: 'claude_ai',
    };
  }

  // ── Sales pitch (lead_score === 'none') ─────
  if (lead_score === 'none') {
    const leadId = await storeLead(lead, {
      businessId, formId, sourceUrl, ipAddress,
      status: 'sales_pitch',
      priority: 'low',
      leadScore: 0,
      aiAnalysis: analysis,
    });
    return { status: 'sales_pitch', leadId, reasons: [reason] };
  }

  // ── Qualified lead ───────────────────────────
  const leadId = await storeLead(lead, {
    businessId, formId, sourceUrl, ipAddress,
    status: 'qualified',
    priority: priority || 'low',
    leadScore: lead_score_numeric || 20,
    aiAnalysis: analysis,
  });

  return {
    status: 'qualified',
    leadId,
    score: lead_score_numeric,
    priority: priority || 'low',
    aiAnalysis: analysis,
  };
}

// ────────────────────────────────────────────
// Store lead in the main leads table
// ────────────────────────────────────────────
async function storeLead(lead, opts) {
  const { businessId, formId, sourceUrl, ipAddress, status, priority, leadScore, aiAnalysis } = opts;

  const [result] = await pool.query(
    `INSERT INTO leads
     (business_id, form_id, name, email, phone, answers,
      submission_time, source_url, ip_address,
      status, priority, lead_score, ai_analysis, pipeline_log, spam_score)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      formId || null,
      lead.name || null,
      lead.email || null,
      lead.phone || null,
      lead.answers ? JSON.stringify(lead.answers) : JSON.stringify([]),
      sourceUrl || '',
      ipAddress || '',
      status,
      priority || 'low',
      leadScore || 0,
      aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      JSON.stringify([
        { layer: 1, name: 'Honeypot', result: 'PASS' },
        { layer: 2, name: 'Claude AI', result: status.toUpperCase(), reasons: aiAnalysis?.reason ? [aiAnalysis.reason] : [] },
      ]),
      0,
    ]
  );
  return result.insertId;
}

// ────────────────────────────────────────────
// Store in spam_leads table
// ────────────────────────────────────────────
async function storeSpamLead(lead, opts) {
  const { businessId, formId, sourceUrl, ipAddress, spamScore, spamReasons } = opts;

  const message = lead.message || (Array.isArray(lead.answers)
    ? lead.answers.map(a => `${a.question}: ${a.answer}`).join('\n')
    : '');

  const [result] = await pool.query(
    `INSERT INTO spam_leads
     (business_id, form_id, name, email, phone, message, answers,
      spam_score, spam_reasons, source_url, ip_address, raw_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      formId || null,
      lead.name || null,
      lead.email || null,
      lead.phone || null,
      message,
      lead.answers ? JSON.stringify(lead.answers) : null,
      spamScore,
      JSON.stringify(spamReasons),
      sourceUrl || '',
      ipAddress || '',
      JSON.stringify(lead),
    ]
  );
  return result.insertId;
}

// ────────────────────────────────────────────
// Auto-delete oldest spam when count > 100
// ────────────────────────────────────────────
async function autoDeleteOldestSpam(businessId) {
  try {
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as count FROM spam_leads WHERE business_id = ?',
      [businessId]
    );
    const count = countResult[0].count;
    if (count > AUTO_DELETE_SPAM_THRESHOLD) {
      const excess = count - AUTO_DELETE_SPAM_THRESHOLD;
      await pool.query(
        `DELETE FROM spam_leads WHERE business_id = ? AND is_reviewed = 0 AND marked_not_spam = 0
         ORDER BY submission_time ASC LIMIT ?`,
        [businessId, excess]
      );
    }
  } catch (err) {
    console.error('Auto-delete spam error:', err.message);
  }
}

module.exports = { processLead, storeLead };
