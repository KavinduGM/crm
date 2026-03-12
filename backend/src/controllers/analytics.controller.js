const { pool } = require('../config/db');

async function getSummary(req, res) {
  try {
    const adminId = req.admin.id;

    // Total qualified leads this month
    const [totalLeads] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND MONTH(l.submission_time) = MONTH(NOW()) AND YEAR(l.submission_time) = YEAR(NOW())
       AND l.status != 'spam'`,
      [adminId]
    );

    // Spam this month
    const [spamCount] = await pool.query(
      `SELECT COUNT(*) as total FROM spam_leads sl
       JOIN businesses b ON sl.business_id = b.id
       WHERE b.admin_id = ? AND MONTH(sl.submission_time) = MONTH(NOW()) AND YEAR(sl.submission_time) = YEAR(NOW())`,
      [adminId]
    );

    // Sales pitches this month
    const [salesPitchCount] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.status = 'sales_pitch'
       AND MONTH(l.submission_time) = MONTH(NOW()) AND YEAR(l.submission_time) = YEAR(NOW())`,
      [adminId]
    );

    // Qualified leads (status = 'qualified')
    const [qualifiedCount] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.status = 'qualified'
       AND MONTH(l.submission_time) = MONTH(NOW()) AND YEAR(l.submission_time) = YEAR(NOW())`,
      [adminId]
    );

    // Hot leads (priority = high)
    const [hotCount] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.priority = 'high' AND l.status = 'qualified'`,
      [adminId]
    );

    // Medium leads
    const [mediumCount] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.priority = 'medium' AND l.status = 'qualified'`,
      [adminId]
    );

    // Low leads
    const [lowCount] = await pool.query(
      `SELECT COUNT(*) as total FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.priority = 'low' AND l.status = 'qualified'`,
      [adminId]
    );

    // Average lead score
    const [avgScore] = await pool.query(
      `SELECT ROUND(AVG(l.lead_score), 1) as avg_score FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.status = 'qualified'`,
      [adminId]
    );

    // Last 7 days trend
    const [trend] = await pool.query(
      `SELECT
        DATE(l.submission_time) as date,
        SUM(CASE WHEN l.status = 'qualified' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN l.status = 'sales_pitch' THEN 1 ELSE 0 END) as sales_pitch
       FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.submission_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(l.submission_time)
       ORDER BY date ASC`,
      [adminId]
    );

    const [spamTrend] = await pool.query(
      `SELECT DATE(sl.submission_time) as date, COUNT(*) as spam
       FROM spam_leads sl JOIN businesses b ON sl.business_id = b.id
       WHERE b.admin_id = ? AND sl.submission_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(sl.submission_time) ORDER BY date ASC`,
      [adminId]
    );

    // Top businesses by leads
    const [topBusinesses] = await pool.query(
      `SELECT b.company_name, COUNT(l.id) as lead_count,
        SUM(CASE WHEN l.priority = 'high' THEN 1 ELSE 0 END) as hot_leads
       FROM leads l
       JOIN businesses b ON l.business_id = b.id
       WHERE b.admin_id = ? AND l.status = 'qualified'
       GROUP BY b.id, b.company_name
       ORDER BY lead_count DESC
       LIMIT 5`,
      [adminId]
    );

    // Total spam ever (for all businesses)
    const [totalSpamEver] = await pool.query(
      `SELECT COUNT(*) as total FROM spam_leads sl
       JOIN businesses b ON sl.business_id = b.id WHERE b.admin_id = ?`,
      [adminId]
    );

    res.json({
      success: true,
      data: {
        overview: {
          total_leads_month: totalLeads[0].total,
          spam_blocked_month: spamCount[0].total,
          sales_pitches_month: salesPitchCount[0].total,
          qualified_leads_month: qualifiedCount[0].total,
          hot_leads_total: hotCount[0].total,
          medium_leads_total: mediumCount[0].total,
          low_leads_total: lowCount[0].total,
          avg_lead_score: avgScore[0].avg_score || 0,
          total_spam_ever: totalSpamEver[0].total,
        },
        trend_7d: { leads: trend, spam: spamTrend },
        top_businesses: topBusinesses,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getSummary };
