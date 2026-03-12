/**
 * LAYER 3 — AI Lead Analyzer
 * Only called for leads that passed Layers 1 & 2.
 * Uses GPT-4o-mini for cost efficiency.
 * Returns structured AI analysis.
 */
const openai = require('../../config/openai');

/**
 * @param {Object} lead - { name, email, phone, message, answers, location?, service? }
 * @param {Object} businessContext - { company_name, industry, services }
 * @returns {Object} analysis - structured lead analysis
 */
async function analyzeWithAI(lead, businessContext = {}) {
  const messageText = buildMessageText(lead);

  const prompt = `You are an expert CRM lead analyst. Analyze this incoming lead for a ${businessContext.industry || 'business'} company named "${businessContext.company_name || 'the business'}".

Business services offered: ${businessContext.services || 'General services'}

Lead Information:
- Name: ${lead.name || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Message/Inquiry: ${messageText}
${lead.location ? `- Location: ${lead.location}` : ''}
${lead.service ? `- Service requested: ${lead.service}` : ''}

Analyze this lead and return ONLY a valid JSON object with this exact structure:
{
  "intent": "Service Request" | "Information Request" | "Quote Request" | "Emergency" | "General Inquiry",
  "service_requested": "specific service name or null",
  "urgency": "Immediate" | "Within 24 hours" | "Within a week" | "Within a month" | "Planning stage" | "Unknown",
  "budget_signal": "specific budget range or null",
  "location": "detected location or null",
  "project_size": "Small" | "Medium" | "Large" | "Enterprise" | "Unknown",
  "summary": "2-3 sentence professional summary of the inquiry",
  "service_relevance": "High" | "Medium" | "Low",
  "conversion_probability": <number 0-100>,
  "estimated_value": "estimated project value range or null",
  "key_signals": ["array", "of", "notable", "signals"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    });

    const raw = completion.choices[0].message.content;
    const analysis = JSON.parse(raw);
    return { success: true, analysis };
  } catch (error) {
    console.error('AI Analyzer error:', error.message);
    // Return a fallback analysis so pipeline continues
    return {
      success: false,
      analysis: {
        intent: 'General Inquiry',
        service_requested: lead.service || null,
        urgency: 'Unknown',
        budget_signal: null,
        location: lead.location || null,
        project_size: 'Unknown',
        summary: 'AI analysis unavailable. Manual review recommended.',
        service_relevance: 'Medium',
        conversion_probability: 40,
        estimated_value: null,
        key_signals: [],
      },
    };
  }
}

function buildMessageText(lead) {
  const parts = [lead.message || ''];
  if (Array.isArray(lead.answers)) {
    lead.answers.forEach(a => {
      if (a.answer) parts.push(`${a.question}: ${a.answer}`);
    });
  }
  return parts.filter(Boolean).join('\n');
}

module.exports = { analyzeWithAI };
