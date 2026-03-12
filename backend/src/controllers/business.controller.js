const { pool } = require('../config/db');

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const query = excludeId
      ? 'SELECT id FROM businesses WHERE slug = ? AND id != ?'
      : 'SELECT id FROM businesses WHERE slug = ?';
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}

async function getAll(req, res) {
  try {
    const [businesses] = await pool.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM contact_forms cf WHERE cf.business_id = b.id AND cf.is_active = 1) as form_count,
        (SELECT COUNT(*) FROM leads l WHERE l.business_id = b.id) as lead_count
       FROM businesses b
       WHERE b.admin_id = ?
       ORDER BY b.created_at DESC`,
      [req.admin.id]
    );
    res.json({ success: true, data: businesses });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM businesses WHERE id = ? AND admin_id = ?',
      [req.params.id, req.admin.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function create(req, res) {
  try {
    const {
      company_name, email, phone, website, industry,
      num_employees, annual_revenue, social_links,
      paid_platforms, messaging_apps, notes, logo_url,
    } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required' });
    }

    const baseSlug = generateSlug(company_name);
    const slug = await ensureUniqueSlug(baseSlug);

    const [result] = await pool.query(
      `INSERT INTO businesses
       (admin_id, company_name, slug, email, phone, website, industry,
        num_employees, annual_revenue, social_links, paid_platforms, messaging_apps, notes, logo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.admin.id,
        company_name.trim(),
        slug,
        email || null,
        phone || null,
        website || null,
        industry || null,
        num_employees || null,
        annual_revenue || null,
        social_links ? JSON.stringify(social_links) : null,
        paid_platforms ? JSON.stringify(paid_platforms) : null,
        messaging_apps ? JSON.stringify(messaging_apps) : null,
        notes || null,
        logo_url || null,
      ]
    );

    const [newBusiness] = await pool.query('SELECT * FROM businesses WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newBusiness[0] });
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function update(req, res) {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM businesses WHERE id = ? AND admin_id = ?',
      [req.params.id, req.admin.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const {
      company_name, email, phone, website, industry,
      num_employees, annual_revenue, social_links,
      paid_platforms, messaging_apps, notes, logo_url,
    } = req.body;

    let slug = existing[0].slug;
    if (company_name && company_name.trim() !== existing[0].company_name) {
      const baseSlug = generateSlug(company_name);
      slug = await ensureUniqueSlug(baseSlug, req.params.id);
    }

    await pool.query(
      `UPDATE businesses SET
        company_name = ?, slug = ?, email = ?, phone = ?, website = ?,
        industry = ?, num_employees = ?, annual_revenue = ?,
        social_links = ?, paid_platforms = ?, messaging_apps = ?, notes = ?, logo_url = ?
       WHERE id = ? AND admin_id = ?`,
      [
        company_name?.trim() || existing[0].company_name,
        slug,
        email !== undefined ? email : existing[0].email,
        phone !== undefined ? phone : existing[0].phone,
        website !== undefined ? website : existing[0].website,
        industry !== undefined ? industry : existing[0].industry,
        num_employees !== undefined ? num_employees : existing[0].num_employees,
        annual_revenue !== undefined ? annual_revenue : existing[0].annual_revenue,
        social_links !== undefined ? JSON.stringify(social_links) : existing[0].social_links,
        paid_platforms !== undefined ? JSON.stringify(paid_platforms) : existing[0].paid_platforms,
        messaging_apps !== undefined ? JSON.stringify(messaging_apps) : existing[0].messaging_apps,
        notes !== undefined ? notes : existing[0].notes,
        logo_url !== undefined ? logo_url : existing[0].logo_url,
        req.params.id,
        req.admin.id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM businesses WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM businesses WHERE id = ? AND admin_id = ?',
      [req.params.id, req.admin.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    await pool.query('DELETE FROM businesses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getAll, getOne, create, update, remove };
