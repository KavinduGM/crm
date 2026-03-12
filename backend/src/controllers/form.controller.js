const { pool } = require('../config/db');
const openai = require('../config/openai');

const DEFAULT_STANDARD_FIELDS = [
  { id: 'full_name', type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true },
  { id: 'email', type: 'email', label: 'Email Address', placeholder: 'your@email.com', required: true },
  { id: 'phone', type: 'tel', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
  {
    id: 'service',
    type: 'select',
    label: 'Service Needed',
    required: true,
    options: ['General Inquiry', 'Support', 'Sales', 'Partnership', 'Other'],
  },
  { id: 'message', type: 'textarea', label: 'Project Details / Message', placeholder: 'Tell us about your project or inquiry...', required: true },
];

async function getForBusiness(req, res) {
  try {
    const { businessId } = req.params;
    // Verify business belongs to admin
    const [biz] = await pool.query(
      'SELECT id FROM businesses WHERE id = ? AND admin_id = ?',
      [businessId, req.admin.id]
    );
    if (biz.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const [forms] = await pool.query(
      `SELECT cf.*,
        (SELECT COUNT(*) FROM leads l WHERE l.form_id = cf.id) as lead_count
       FROM contact_forms cf
       WHERE cf.business_id = ?
       ORDER BY cf.created_at DESC`,
      [businessId]
    );
    res.json({ success: true, data: forms });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT cf.* FROM contact_forms cf
       JOIN businesses b ON cf.business_id = b.id
       WHERE cf.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function create(req, res) {
  try {
    const { businessId } = req.params;
    const {
      name, form_type, fields, branding, contact_info,
      ai_config, thank_you_message,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Form name is required' });
    }

    // Verify business belongs to admin
    const [biz] = await pool.query(
      'SELECT id FROM businesses WHERE id = ? AND admin_id = ?',
      [businessId, req.admin.id]
    );
    if (biz.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const formFields = fields || DEFAULT_STANDARD_FIELDS;
    const defaultBranding = {
      primary_color: '#6366f1',
      font: 'Inter',
      description: 'Fill out the form below and we\'ll get back to you shortly.',
      logo_url: null,
    };

    const [result] = await pool.query(
      `INSERT INTO contact_forms
       (business_id, name, slug, form_type, fields, branding, contact_info, ai_config, thank_you_message)
       VALUES (?, ?, 'contact-us', ?, ?, ?, ?, ?, ?)`,
      [
        businessId,
        name.trim(),
        form_type || 'standard',
        JSON.stringify(formFields),
        JSON.stringify({ ...defaultBranding, ...branding }),
        contact_info ? JSON.stringify(contact_info) : null,
        ai_config ? JSON.stringify(ai_config) : null,
        thank_you_message || 'Thank you for contacting us. Our team will get back to you shortly.',
      ]
    );

    const [newForm] = await pool.query('SELECT * FROM contact_forms WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newForm[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This business already has a form with that slug' });
    }
    console.error('Create form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function update(req, res) {
  try {
    const [existing] = await pool.query(
      `SELECT cf.* FROM contact_forms cf
       JOIN businesses b ON cf.business_id = b.id
       WHERE cf.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const { name, fields, branding, contact_info, ai_config, thank_you_message, is_active } = req.body;
    const form = existing[0];

    await pool.query(
      `UPDATE contact_forms SET
        name = ?, fields = ?, branding = ?, contact_info = ?,
        ai_config = ?, thank_you_message = ?, is_active = ?
       WHERE id = ?`,
      [
        name?.trim() || form.name,
        fields !== undefined ? JSON.stringify(fields) : form.fields,
        branding !== undefined ? JSON.stringify(branding) : form.branding,
        contact_info !== undefined ? JSON.stringify(contact_info) : form.contact_info,
        ai_config !== undefined ? JSON.stringify(ai_config) : form.ai_config,
        thank_you_message !== undefined ? thank_you_message : form.thank_you_message,
        is_active !== undefined ? is_active : form.is_active,
        req.params.id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM contact_forms WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const [existing] = await pool.query(
      `SELECT cf.id FROM contact_forms cf
       JOIN businesses b ON cf.business_id = b.id
       WHERE cf.id = ? AND b.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    await pool.query('DELETE FROM contact_forms WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Generate AI questions based on admin-provided context
async function generateAiQuestions(req, res) {
  try {
    const { industry, category, services, goal, target_customer } = req.body;

    if (!industry || !services) {
      return res.status(400).json({ success: false, message: 'Industry and services are required' });
    }

    const prompt = `You are a CRM form designer. Generate a smart conversational form question flow for a ${industry} business.

Business Context:
- Industry: ${industry}
- Category: ${category || industry}
- Services/Products: ${Array.isArray(services) ? services.join(', ') : services}
- Form Goal: ${goal || 'Capture qualified leads'}
- Target Customer: ${target_customer || 'General businesses and individuals'}

Generate 4-6 smart qualifying questions that will help understand the visitor's needs. Each question must have clickable option choices (not free-text except for one optional open field).

Return a JSON array of questions in this exact format:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "type": "single_choice",
    "options": ["Option 1", "Option 2", "Option 3"],
    "next_question_logic": "always_next"
  }
]

Rules:
- Always start with the most important qualifying question
- Questions should feel conversational, not like a form
- Each question must have 2-5 clear options
- The last question can be type "textarea" for additional details
- Make questions specific to the services provided`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    let questions;
    try {
      const parsed = JSON.parse(completion.choices[0].message.content);
      questions = parsed.questions || parsed;
      if (!Array.isArray(questions)) {
        questions = Object.values(parsed)[0];
      }
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to parse AI response' });
    }

    res.json({ success: true, data: { questions } });
  } catch (error) {
    console.error('Generate AI questions error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate questions' });
  }
}

module.exports = { getForBusiness, getOne, create, update, remove, generateAiQuestions };
