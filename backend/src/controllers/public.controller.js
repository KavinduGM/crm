const { pool } = require('../config/db');
const openai = require('../config/openai');
const { v4: uuidv4 } = require('uuid');
const { processLead } = require('../services/pipeline');
const { verifyCaptcha } = require('../services/captcha');

// ─────────────────────────────────────────────────────
// Get public form data by business slug
// ─────────────────────────────────────────────────────
async function getPublicForm(req, res) {
  try {
    const { company_slug } = req.params;

    const [businesses] = await pool.query(
      'SELECT * FROM businesses WHERE slug = ? AND is_active = 1',
      [company_slug]
    );
    if (businesses.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    const business = businesses[0];

    const [forms] = await pool.query(
      'SELECT * FROM contact_forms WHERE business_id = ? AND slug = ? AND is_active = 1',
      [business.id, 'contact-us']
    );
    if (forms.length === 0) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    const form = forms[0];

    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          company_name: business.company_name,
          slug: business.slug,
          email: business.email,
          logo_url: business.logo_url,
          social_links: business.social_links,
          messaging_apps: business.messaging_apps,
        },
        form: {
          id: form.id,
          name: form.name,
          form_type: form.form_type,
          fields: form.fields,
          branding: form.branding,
          contact_info: form.contact_info,
          ai_config: form.ai_config,
          thank_you_message: form.thank_you_message,
        },
      },
    });
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ─────────────────────────────────────────────────────
// Submit standard form — routes through Phase 2 pipeline
// ─────────────────────────────────────────────────────
async function submitStandardForm(req, res) {
  try {
    const { company_slug } = req.params;
    const { name, email, phone, answers, honeypot, captchaId, captchaAnswer } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    // ── Honeypot check (silent accept to fool bots)
    if (honeypot && honeypot.trim() !== '') {
      try {
        await pool.query(
          'INSERT INTO spam_logs (ip_address, reason, payload, user_agent) VALUES (?, ?, ?, ?)',
          [ip, 'honeypot', JSON.stringify(req.body), req.headers['user-agent'] || '']
        );
      } catch { /* non-fatal */ }
      return res.status(201).json({ success: true, message: 'Form submitted successfully' });
    }

    // ── CAPTCHA verification
    if (captchaId) {
      const captchaResult = await verifyCaptcha(captchaId, captchaAnswer);
      if (!captchaResult.valid) {
        try {
          await pool.query(
            'INSERT INTO spam_logs (ip_address, reason, payload, user_agent) VALUES (?, ?, ?, ?)',
            [ip, 'captcha_fail', JSON.stringify({ email }), req.headers['user-agent'] || '']
          );
        } catch { /* non-fatal */ }
        return res.status(400).json({ success: false, message: 'Captcha verification failed. Please refresh and try again.' });
      }
    }

    const [businesses] = await pool.query(
      'SELECT id FROM businesses WHERE slug = ? AND is_active = 1',
      [company_slug]
    );
    if (businesses.length === 0) return res.status(404).json({ success: false, message: 'Business not found' });

    const [forms] = await pool.query(
      'SELECT id FROM contact_forms WHERE business_id = ? AND slug = ? AND is_active = 1',
      [businesses[0].id, 'contact-us']
    );
    if (forms.length === 0) return res.status(404).json({ success: false, message: 'Form not found' });

    // Build normalized lead
    const lead = {
      name: name || '',
      email: email.toLowerCase().trim(),
      phone: phone || '',
      message: '',
      answers: answers || [],
    };

    // Run pipeline (Layers 1, 2, 3 + scoring)
    await processLead(lead, {
      formId: forms[0].id,
      businessId: businesses[0].id,
      sourceUrl: req.headers.referer || '',
      ipAddress: ip,
    });

    res.status(201).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ─────────────────────────────────────────────────────
// Start AI conversation session
// ─────────────────────────────────────────────────────
async function startAiSession(req, res) {
  try {
    const { company_slug } = req.params;

    const [businesses] = await pool.query(
      'SELECT id FROM businesses WHERE slug = ? AND is_active = 1',
      [company_slug]
    );
    if (businesses.length === 0) return res.status(404).json({ success: false, message: 'Business not found' });

    const [forms] = await pool.query(
      'SELECT * FROM contact_forms WHERE business_id = ? AND slug = ? AND form_type = ? AND is_active = 1',
      [businesses[0].id, 'contact-us', 'ai']
    );
    if (forms.length === 0) return res.status(404).json({ success: false, message: 'AI form not found' });

    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO ai_sessions (session_token, form_id, business_id, conversation_history, collected_data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionToken, forms[0].id, businesses[0].id, JSON.stringify([]), JSON.stringify({}), expiresAt]
    );

    res.json({ success: true, data: { session_token: sessionToken } });
  } catch (error) {
    console.error('Start AI session error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ─────────────────────────────────────────────────────
// Send message in AI conversation
// ─────────────────────────────────────────────────────
async function sendAiMessage(req, res) {
  try {
    const { session_token, message, collected_data } = req.body;

    if (!session_token || !message) {
      return res.status(400).json({ success: false, message: 'session_token and message are required' });
    }

    const [sessions] = await pool.query(
      `SELECT s.*, cf.ai_config, cf.id as form_id, b.company_name, b.id as biz_id
       FROM ai_sessions s
       JOIN contact_forms cf ON s.form_id = cf.id
       JOIN businesses b ON s.business_id = b.id
       WHERE s.session_token = ? AND s.status = 'active' AND s.expires_at > NOW()`,
      [session_token]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found or expired' });
    }

    const session = sessions[0];
    const aiConfig = session.ai_config || {};
    const history = session.conversation_history || [];

    const systemPrompt = `You are a friendly and professional lead qualification assistant for ${session.company_name}.

Your role: Guide visitors through a conversational form to understand their needs.

Business Context:
- Industry: ${aiConfig.industry || 'Business'}
- Services: ${aiConfig.services ? (Array.isArray(aiConfig.services) ? aiConfig.services.join(', ') : aiConfig.services) : 'Various services'}
- Goal: ${aiConfig.goal || 'Understand client needs'}
- Target Customer: ${aiConfig.target_customer || 'Businesses and individuals'}

Instructions:
1. Be warm, concise, and professional
2. Ask ONE question at a time
3. When asking questions with options, format them as a JSON block: {"options": ["Option 1", "Option 2", "Option 3"]}
4. Collect: name, email, phone number early in the conversation
5. Then ask qualifying questions based on the AI questions config
6. When you have enough information, say EXACTLY: "CONVERSATION_COMPLETE" followed by a thank you message
7. Keep responses short and conversational
8. Never ask for sensitive financial information

AI Generated Questions to ask: ${JSON.stringify(aiConfig.generated_questions || [])}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const assistantMessage = completion.choices[0].message.content;
    const isComplete = assistantMessage.includes('CONVERSATION_COMPLETE');
    const updatedHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: assistantMessage }];
    const updatedData = { ...session.collected_data, ...collected_data };

    if (isComplete) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

      const answers = updatedHistory
        .filter(m => m.role === 'user')
        .map((m, i) => ({ question: `Response ${i + 1}`, answer: m.content }));

      const lead = {
        name: updatedData.name || null,
        email: updatedData.email || 'unknown@ai-form.com',
        phone: updatedData.phone || null,
        message: '',
        answers,
      };

      // Route AI form completion through pipeline too
      await processLead(lead, {
        formId: session.form_id,
        businessId: session.business_id,
        sourceUrl: req.headers.referer || '',
        ipAddress: ip,
      });

      await pool.query(
        'UPDATE ai_sessions SET status = ?, conversation_history = ?, collected_data = ? WHERE session_token = ?',
        ['completed', JSON.stringify(updatedHistory), JSON.stringify(updatedData), session_token]
      );
    } else {
      await pool.query(
        'UPDATE ai_sessions SET conversation_history = ?, collected_data = ? WHERE session_token = ?',
        [JSON.stringify(updatedHistory), JSON.stringify(updatedData), session_token]
      );
    }

    res.json({
      success: true,
      data: {
        message: assistantMessage.replace('CONVERSATION_COMPLETE', '').trim(),
        is_complete: isComplete,
      },
    });
  } catch (error) {
    console.error('AI message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getPublicForm, submitStandardForm, startAiSession, sendAiMessage };
