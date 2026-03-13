/**
 * AI Lead Classifier + Analyzer (Claude API)
 *
 * Single Claude call that:
 *   1. Detects spam (is_spam: true/false)
 *   2. Scores qualified leads (lead_score: "high" | "medium" | "low" | "none")
 *
 * Scoring rules:
 *   HIGH   — large deal, urgent need, specific ask, decision-maker
 *   MEDIUM — interested but vague, early exploration
 *   LOW    — generic inquiry, student, low budget signals
 *   NONE   — outbound sales pitch (cold email targeting this business)
 *   SPAM   — marketing blast, phishing, irrelevant, spam links, self-promotion
 */
const Anthropic = require('@anthropic-ai/sdk');
const { getClaudeApiKey } = require('../settings.service');

/**
 * Build a single text block from the lead's message + form answers
 */
function buildMessageText(lead) {
  const parts = [lead.message || ''];
  if (Array.isArray(lead.answers)) {
    lead.answers.forEach(a => {
      if (a.answer) parts.push(`${a.question}: ${a.answer}`);
    });
  }
  return parts.filter(Boolean).join('\n').trim();
}

/**
 * @param {Object} lead - { name, email, phone, message, answers }
 * @param {Object} businessContext - { company_name, industry, services }
 * @returns {{ success: boolean, analysis: Object }}
 */
async function analyzeWithAI(lead, businessContext = {}) {
  const messageText = buildMessageText(lead);
  const emailDomain = (lead.email || '').split('@')[1] || 'unknown';

  const prompt = `You are a CRM assistant for a ${businessContext.industry || 'business'} company called "${businessContext.company_name || 'the business'}"${businessContext.services ? ` that offers: ${businessContext.services}` : ''}.

Analyze the following form submission and classify it.

Submission details:
Name: ${lead.name || 'Unknown'}
Email: ${lead.email || 'Not provided'} (domain: @${emailDomain})
Phone: ${lead.phone || 'Not provided'}
Message: ${messageText || '(empty)'}

Rules:
- Mark is_spam: true if: marketing blast, phishing attempt, irrelevant content, spam/promo links, clearly fake submission, no genuine service request
- Mark lead_score "high" if: large deal, urgent need, specific service request, decision-maker signals
- Mark lead_score "medium" if: interested but vague, exploring options, early-stage inquiry
- Mark lead_score "low" if: generic inquiry, student, low-budget signals, casual question
- Mark lead_score "none" if: this person is pitching their OWN services to this business (cold outreach / B2B sales)
- If is_spam is true, lead_score must be "none"

Return JSON only, no other text:
{ "is_spam": true or false, "lead_score": "high" or "medium" or "low" or "none", "reason": "one sentence explanation" }`;

  // Get API key fresh on each call so admin changes take effect immediately
  const apiKey = await getClaudeApiKey();
  if (!apiKey) {
    console.error('Claude API key not configured');
    return fallbackAnalysis('Claude API key not set — manual review needed');
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();

    // Extract JSON even if Claude wraps it in markdown code fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalise
    const isSpam = Boolean(parsed.is_spam);
    const rawScore = (parsed.lead_score || 'low').toLowerCase();
    const validScores = ['high', 'medium', 'low', 'none'];
    const leadScore = validScores.includes(rawScore) ? rawScore : 'low';
    const reason = parsed.reason || '';

    // Map lead_score → priority & numeric score for DB storage
    const priorityMap = { high: 'high', medium: 'medium', low: 'low', none: 'low' };
    const numericScoreMap = { high: 80, medium: 50, low: 20, none: 0 };

    const analysis = {
      is_spam: isSpam,
      lead_score: leadScore,
      reason,
      // Legacy fields kept for pipeline compatibility
      classification: isSpam ? 'spam' : leadScore === 'none' ? 'sales_pitch' : 'qualified',
      classification_reason: reason,
      priority: isSpam ? 'low' : priorityMap[leadScore],
      lead_score_numeric: isSpam ? 100 : numericScoreMap[leadScore],
      // Stub out fields the lead detail page may reference
      intent: 'General Inquiry',
      service_requested: null,
      urgency: 'Unknown',
      budget_signal: null,
      location: null,
      project_size: 'Unknown',
      summary: reason,
      conversion_probability: isSpam ? 0 : numericScoreMap[leadScore],
      estimated_value: null,
      key_signals: [],
    };

    return { success: true, analysis };
  } catch (error) {
    console.error('Claude AI Analyzer error:', error.message);
    return fallbackAnalysis(`AI error: ${error.message}`);
  }
}

function fallbackAnalysis(reason) {
  return {
    success: false,
    analysis: {
      is_spam: false,
      lead_score: 'low',
      reason,
      classification: 'qualified',
      classification_reason: reason,
      priority: 'low',
      lead_score_numeric: 20,
      intent: 'General Inquiry',
      service_requested: null,
      urgency: 'Unknown',
      budget_signal: null,
      location: null,
      project_size: 'Unknown',
      summary: 'AI analysis unavailable. Please review manually.',
      conversion_probability: 20,
      estimated_value: null,
      key_signals: ['ai_unavailable'],
    },
  };
}

module.exports = { analyzeWithAI };
