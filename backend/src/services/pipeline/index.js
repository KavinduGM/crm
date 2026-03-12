/**
 * Lead Processing Pipeline Orchestrator
 *
 * Flow:
 * Incoming Lead → Layer 1 (Spam) → Layer 2 (Intent) → Layer 3 (AI) → Scorer → Store
 */
const { pool } = require('../../config/db');
const { runSpamFilter } = require('./spamFilter');
const { runIntentFilter } = require('./intentFilter');
const { analyzeWithAI } = require('./aiAnalyzer');
const { scoreLead } = require('./leadScorer');

const AUTO_DELETE_SPAM_THRESHOLD = 100;

/**
 * Main pipeline entry point.
 * @param {Object} lead - normalized lead payload
 * @param {Object} meta - { formId, businessId, sourceUrl, ipAddress, userAgent }
 * @returns {{ status: string, leadId?: number, spamLeadId?: number, reason?: string }}
 */
async function processLead(lead, meta) {
  const { formId, businessId, sourceUrl, ipAddress } = meta;
  const pipelineLog = [];

  // ─────────────────────────────────────────
  // Fetch domain whitelist for this business
  // ─────────────────────────────────────────
  let domainWhitelist = new Set();
  try {
    const [whitelistRows] = await pool.query(
      'SELECT domain FROM domain_whitelist WHERE business_id = ?',
      [businessId]
    );
    domainWhitelist = new Set(whitelistRows.map(r => r.domain));
  } catch { /* non-fatal */ }

  // ─────────────────────────────────────────
  // Fetch business context for scoring/AI
  // ─────────────────────────────────────────
  let businessContext = {};
  let formContext = {};
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
        formContext = formRows[0].ai_config;
        businessContext.services = formContext.services || '';
      }
    }
  } catch { /* non-fatal */ }

  // ═══════════════════════════════════════════
  // LAYER 1 — SPAM FILTER
  // ═══════════════════════════════════════════
  const spamResult = runSpamFilter(lead, { domainWhitelist });
  pipelineLog.push({ layer: 1, name: 'SpamFilter', result: spamResult.isSpam ? 'SPAM' : 'PASS', score: spamResult.score, reasons: spamResult.reasons });

  if (spamResult.isSpam) {
    // Store in spam_leads
    const spamId = await storeSpamLead(lead, { businessId, formId, sourceUrl, ipAddress, spamScore: spamResult.score, spamReasons: spamResult.reasons });

    // Auto-delete oldest spam if over threshold
    await autoDeleteOldestSpam(businessId);

    return { status: 'spam', spamLeadId: spamId, score: spamResult.score, reasons: spamResult.reasons };
  }

  // ═══════════════════════════════════════════
  // LAYER 2 — INTENT FILTER
  // ═══════════════════════════════════════════
  const intentResult = runIntentFilter(lead);
  pipelineLog.push({ layer: 2, name: 'IntentFilter', result: intentResult.isSalesPitch ? 'SALES_PITCH' : 'PASS', confidence: intentResult.confidence, reasons: intentResult.reasons });

  if (intentResult.isSalesPitch) {
    // Store in leads table with status = sales_pitch
    const leadId = await storeLead(lead, {
      businessId, formId, sourceUrl, ipAddress,
      status: 'sales_pitch',
      priority: 'low',
      leadScore: 0,
      aiAnalysis: null,
      pipelineLog,
      spamScore: spamResult.score,
    });
    return { status: 'sales_pitch', leadId, reasons: intentResult.reasons };
  }

  // ═══════════════════════════════════════════
  // LAYER 3 — AI LEAD ANALYZER
  // ═══════════════════════════════════════════
  const { analysis: aiAnalysis } = await analyzeWithAI(lead, businessContext);
  pipelineLog.push({ layer: 3, name: 'AIAnalyzer', result: 'ANALYZED', intent: aiAnalysis.intent, urgency: aiAnalysis.urgency });

  // ═══════════════════════════════════════════
  // LEAD SCORING ENGINE
  // ═══════════════════════════════════════════
  const { score, priority, breakdown } = scoreLead(lead, aiAnalysis, businessContext);
  aiAnalysis.score_breakdown = breakdown;
  pipelineLog.push({ layer: 4, name: 'LeadScorer', result: 'SCORED', score, priority });

  // Store qualified lead
  const leadId = await storeLead(lead, {
    businessId, formId, sourceUrl, ipAddress,
    status: 'qualified',
    priority,
    leadScore: score,
    aiAnalysis,
    pipelineLog,
    spamScore: spamResult.score,
  });

  return { status: 'qualified', leadId, score, priority, aiAnalysis };
}

// ────────────────────────────────────────────
// Store lead in the main leads table
// ────────────────────────────────────────────
async function storeLead(lead, opts) {
  const { businessId, formId, sourceUrl, ipAddress, status, priority, leadScore, aiAnalysis, pipelineLog, spamScore } = opts;

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
      JSON.stringify(pipelineLog),
      spamScore || 0,
    ]
  );
  return result.insertId;
}

// ────────────────────────────────────────────
// Store lead in spam_leads table
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
