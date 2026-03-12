/**
 * LAYER 3 — AI Lead Analyzer + Spam Classifier
 *
 * Single GPT call that does two jobs:
 *   1. Spam / junk detection (service promos, scam, mass outreach, hotmail blasts)
 *   2. Lead quality analysis for legitimate inquiries
 *
 * Uses GPT-4o-mini for cost efficiency.
 */
const openai = require('../../config/openai');

/**
 * @param {Object} lead - { name, email, phone, message, answers }
 * @param {Object} businessContext - { company_name, industry, services }
 * @returns {{ success: boolean, analysis: Object }}
 */
async function analyzeWithAI(lead, businessContext = {}) {
  const messageText = buildMessageText(lead);
  const emailDomain = (lead.email || '').split('@')[1] || '';

  const prompt = `You are an expert CRM analyst. You have TWO jobs for this submission:

JOB 1 — SPAM DETECTION
Decide if this submission is spam, junk, or unsolicited promotional outreach. Mark is_spam = true if ANY of these apply:
- Promoting a service, software, agency, or product the business didn't ask for
- SEO services, backlinks, link building, digital marketing offers
- Mass outreach / cold email templates ("I came across your website...")
- Scam, phishing, fake prize, financial schemes, crypto, gambling
- Gibberish, test submissions, or clearly fake contact details
- The message is NOT a genuine customer inquiry about the business's own services

JOB 2 — LEAD ANALYSIS (only matters if is_spam = false)
Analyse the lead quality for a ${businessContext.industry || 'business'} company named "${businessContext.company_name || 'the business'}" offering: ${businessContext.services || 'general services'}.

Submission details:
- Name: ${lead.name || 'Unknown'}
- Email: ${lead.email || 'Not provided'} (domain: ${emailDomain})
- Phone: ${lead.phone || 'Not provided'}
- Message: ${messageText}
${lead.location ? `- Location: ${lead.location}` : ''}
${lead.service ? `- Service requested: ${lead.service}` : ''}

Return ONLY a valid JSON object with this exact structure:
{
  "is_spam": <true | false>,
  "spam_reason": "<one-line reason if is_spam is true, else null>",
  "intent": "Service Request" | "Information Request" | "Quote Request" | "Emergency" | "General Inquiry",
  "service_requested": "<specific service or null>",
  "urgency": "Immediate" | "Within 24 hours" | "Within a week" | "Within a month" | "Planning stage" | "Unknown",
  "budget_signal": "<budget range or null>",
  "location": "<detected location or null>",
  "project_size": "Small" | "Medium" | "Large" | "Enterprise" | "Unknown",
  "summary": "<2-3 sentence professional summary>",
  "service_relevance": "High" | "Medium" | "Low",
  "conversion_probability": <number 0-100>,
  "estimated_value": "<project value range or null>",
  "key_signals": ["array", "of", "notable", "signals"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = completion.choices[0].message.content;
    const analysis = JSON.parse(raw);
    return { success: true, analysis };
  } catch (error) {
    console.error('AI Analyzer error:', error.message);
    return {
      success: false,
      analysis: {
        is_spam: false,
        spam_reason: null,
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
