const { pool } = require('../config/db');
const { processLead, storeLead } = require('../services/pipeline');

// List all spam leads for this admin's businesses
async function getSpamLeads(req, res) {
  try {
    const { businessId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE b.admin_id = ?';
    const params = [req.admin.id];

    if (businessId) {
      whereClause += ' AND sl.business_id = ?';
      params.push(businessId);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM spam_leads sl JOIN businesses b ON sl.business_id = b.id ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT sl.*, b.company_name
       FROM spam_leads sl
       JOIN businesses b ON sl.business_id = b.id
       ${whereClause}
       ORDER BY sl.submission_time DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get spam leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Get spam lead detail
async function getSpamLeadDetail(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT sl.*, b.company_name FROM spam_leads sl
       JOIN businesses b ON sl.business_id = b.id
       WHERE sl.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Mark spam lead as "Not Spam" → move to leads pipeline
async function markNotSpam(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT sl.* FROM spam_leads sl
       JOIN businesses b ON sl.business_id = b.id
       WHERE sl.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    const spamLead = rows[0];

    // Add domain to whitelist so the same domain is trusted next time
    if (spamLead.email) {
      const domain = spamLead.email.split('@')[1]?.toLowerCase();
      if (domain) {
        await pool.query(
          'INSERT IGNORE INTO domain_whitelist (business_id, domain) VALUES (?, ?)',
          [spamLead.business_id, domain]
        );
      }
    }

    // Mark as reviewed + not-spam in spam table
    await pool.query(
      'UPDATE spam_leads SET is_reviewed = 1, marked_not_spam = 1 WHERE id = ?',
      [req.params.id]
    );

    // Re-process through pipeline (bypassing spam filter since we trust it now)
    const lead = {
      name: spamLead.name,
      email: spamLead.email,
      phone: spamLead.phone,
      message: spamLead.message,
      answers: spamLead.answers || [],
    };

    // Skip spam filter — directly run intent + AI + scoring
    const { runIntentFilter } = require('../services/pipeline/intentFilter');
    const { analyzeWithAI } = require('../services/pipeline/aiAnalyzer');
    const { scoreLead } = require('../services/pipeline/leadScorer');

    const intentResult = runIntentFilter(lead);

    let status = 'qualified';
    let priority = 'low';
    let leadScore = 0;
    let aiAnalysis = null;

    if (intentResult.isSalesPitch) {
      status = 'sales_pitch';
    } else {
      const [bizRows] = await pool.query(
        'SELECT company_name, industry FROM businesses WHERE id = ?',
        [spamLead.business_id]
      );
      const businessContext = bizRows[0] || {};
      const { analysis } = await analyzeWithAI(lead, businessContext);
      aiAnalysis = analysis;
      const scoring = scoreLead(lead, aiAnalysis, businessContext);
      leadScore = scoring.score;
      priority = scoring.priority;
    }

    const leadId = await storeLead(lead, {
      businessId: spamLead.business_id,
      formId: spamLead.form_id,
      sourceUrl: spamLead.source_url,
      ipAddress: spamLead.ip_address,
      status,
      priority,
      leadScore,
      aiAnalysis,
      pipelineLog: [{ layer: 0, name: 'ManualOverride', result: 'NOT_SPAM', reason: 'Marked by admin' }],
      spamScore: 0,
    });

    res.json({ success: true, message: 'Lead moved to CRM', leadId, status, priority });
  } catch (error) {
    console.error('Mark not spam error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Delete spam lead permanently
async function deleteSpamLead(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT sl.id FROM spam_leads sl JOIN businesses b ON sl.business_id = b.id WHERE sl.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query('DELETE FROM spam_leads WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Delete all spam for a business (bulk)
async function deleteAllSpam(req, res) {
  try {
    const { businessId } = req.params;
    const [biz] = await pool.query('SELECT id FROM businesses WHERE id = ? AND admin_id = ?', [businessId, req.admin.id]);
    if (biz.length === 0) return res.status(404).json({ success: false, message: 'Business not found' });
    const [result] = await pool.query('DELETE FROM spam_leads WHERE business_id = ? AND marked_not_spam = 0', [businessId]);
    res.json({ success: true, message: `Deleted ${result.affectedRows} spam records` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getSpamLeads, getSpamLeadDetail, markNotSpam, deleteSpamLead, deleteAllSpam };
