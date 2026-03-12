const { pool } = require('../config/db');

async function getAll(req, res) {
  try {
    const { businessId, formId, page = 1, limit = 20, status, priority } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE b.admin_id = ?';
    const params = [req.admin.id];

    if (businessId) { whereClause += ' AND l.business_id = ?'; params.push(businessId); }
    if (formId) { whereClause += ' AND l.form_id = ?'; params.push(formId); }
    if (status) { whereClause += ' AND l.status = ?'; params.push(status); }
    if (priority) { whereClause += ' AND l.priority = ?'; params.push(priority); }

    // Only show non-spam from this table (spam lives in spam_leads)
    whereClause += " AND l.status != 'spam'";

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l JOIN businesses b ON l.business_id = b.id ${whereClause}`,
      params
    );

    const orderBy = priority === 'high' ? 'l.lead_score DESC, l.submission_time DESC' : 'l.submission_time DESC';

    const [leads] = await pool.query(
      `SELECT l.id, l.name, l.email, l.phone,
        l.submission_time, l.source_url, l.ip_address,
        l.lead_score, l.priority, l.status, l.ai_analysis,
        b.company_name as business_name,
        cf.name as form_name, cf.form_type
       FROM leads l
       JOIN businesses b ON l.business_id = b.id
       LEFT JOIN contact_forms cf ON l.form_id = cf.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: leads,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, b.company_name as business_name, cf.name as form_name, cf.form_type
       FROM leads l
       JOIN businesses b ON l.business_id = b.id
       LEFT JOIN contact_forms cf ON l.form_id = cf.id
       WHERE l.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const [existing] = await pool.query(
      `SELECT l.id FROM leads l JOIN businesses b ON l.business_id = b.id WHERE l.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });
    await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getStats(req, res) {
  try {
    const adminId = req.admin.id;

    const runQuery = (extra = '') => pool.query(
      `SELECT COUNT(*) as total FROM leads l JOIN businesses b ON l.business_id = b.id WHERE b.admin_id = ? AND l.status = 'qualified'${extra}`,
      [adminId]
    );

    const [[totalLeads], [todayLeads], [weekLeads], [hotLeads], [mediumLeads], [lowLeads]] = await Promise.all([
      runQuery(),
      runQuery(' AND DATE(l.submission_time) = CURDATE()'),
      runQuery(' AND l.submission_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)'),
      runQuery(" AND l.priority = 'high'"),
      runQuery(" AND l.priority = 'medium'"),
      runQuery(" AND l.priority = 'low'"),
    ]);

    const [[totalBusinesses]] = await pool.query('SELECT COUNT(*) as total FROM businesses WHERE admin_id = ?', [adminId]);
    const [[totalForms]] = await pool.query(`SELECT COUNT(*) as total FROM contact_forms cf JOIN businesses b ON cf.business_id = b.id WHERE b.admin_id = ?`, [adminId]);
    const [[spamCount]] = await pool.query(`SELECT COUNT(*) as total FROM spam_leads sl JOIN businesses b ON sl.business_id = b.id WHERE b.admin_id = ?`, [adminId]);
    const [[pitchCount]] = await pool.query(`SELECT COUNT(*) as total FROM leads l JOIN businesses b ON l.business_id = b.id WHERE b.admin_id = ? AND l.status = 'sales_pitch'`, [adminId]);

    const [recentLeads] = await pool.query(
      `SELECT l.id, l.name, l.email, l.submission_time, l.priority, l.lead_score, b.company_name
       FROM leads l JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.status = 'qualified'
       ORDER BY l.submission_time DESC LIMIT 5`,
      [adminId]
    );

    res.json({
      success: true,
      data: {
        total_leads: totalLeads[0].total,
        today_leads: todayLeads[0].total,
        week_leads: weekLeads[0].total,
        hot_leads: hotLeads[0].total,
        medium_leads: mediumLeads[0].total,
        low_leads: lowLeads[0].total,
        total_businesses: totalBusinesses[0].total,
        total_forms: totalForms[0].total,
        spam_count: spamCount[0].total,
        sales_pitch_count: pitchCount[0].total,
        recent_leads: recentLeads,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getAll, getOne, remove, getStats };
