/**
 * AI Lead Classifier + Analyzer
 *
 * Single GPT-4o-mini call that does EVERYTHING:
 *   1. Classifies the submission: spam | sales_pitch | qualified
 *   2. If qualified: scores it (0–100) and produces full analysis
 *
 * No rule-based pre-filtering. GPT reads the raw submission and decides.
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

  const prompt = `You are an expert CRM lead analyst for a ${businessContext.industry || 'business'} company called "${businessContext.company_name || 'the business'}" that provides: ${businessContext.services || 'various services'}.

A form submission just came in. Your job:

━━━ STEP 1: CLASSIFY ━━━
Choose exactly one:

"spam" — Mark as spam if ANY of these apply:
  • Message contains URLs / links promoting other websites or businesses
  • Submission is clearly fake (e.g. "rahulkumar576576", gibberish names with numbers)
  • Message is advertising, promoting, or selling something (products, blogs, websites)
  • Crypto, gambling, adult content, pharmacy, lottery, prize scam
  • No genuine service request — just self-promotion or junk

"sales_pitch" — Mark as sales_pitch if:
  • Person is pitching THEIR OWN services to this business (B2B cold outreach)
  • Agency/freelancer offering SEO, marketing, web dev, design services
  • "I can help your business grow", "we offer...", "our team specialises in..."
  • Classic cold email openers: "I came across your website...", "I wanted to reach out..."

"qualified" — Mark as qualified if:
  • Genuine customer who wants THIS business's services
  • Real person asking about pricing, availability, bookings, or help
  • Even a simple "I need help with X" from a real person is qualified
  • When in doubt and the message seems genuine, use qualified

━━━ STEP 2: SCORE (only for qualified leads) ━━━
Score 0–100 based on:
  • How specific and clear the request is
  • Urgency signals (emergency, ASAP, today, etc.)
  • Budget mentioned
  • Location provided
  • Message quality and length
  • How relevant it is to the business's services

━━━ SUBMISSION ━━━
Name: ${lead.name || 'Unknown'}
Email: ${lead.email || 'Not provided'} (domain: ${emailDomain})
Phone: ${lead.phone || 'Not provided'}
Message: ${messageText || '(empty)'}

━━━ RETURN JSON ONLY ━━━
{
  "classification": "spam" | "sales_pitch" | "qualified",
  "classification_reason": "<one sentence why>",
  "lead_score": <0-100 integer>,
  "priority": "high" | "medium" | "low",
  "intent": "Service Request" | "Information Request" | "Quote Request" | "Emergency" | "General Inquiry",
  "service_requested": "<specific service or null>",
  "urgency": "Immediate" | "Within 24 hours" | "Within a week" | "Within a month" | "Planning stage" | "Unknown",
  "budget_signal": "<budget range or null>",
  "location": "<detected location or null>",
  "project_size": "Small" | "Medium" | "Large" | "Enterprise" | "Unknown",
  "summary": "<2-3 sentence professional summary>",
  "conversion_probability": <0-100 integer>,
  "estimated_value": "<value range or null>",
  "key_signals": ["array", "of", "key", "signals"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature = more consistent classification
      max_tokens: 600,
    });

    const raw = completion.choices[0].message.content;
    const analysis = JSON.parse(raw);

    // Normalise fields so downstream code never crashes
    analysis.classification = analysis.classification || 'qualified';
    analysis.lead_score = Number(analysis.lead_score) || 0;
    analysis.priority = analysis.priority || 'low';
    analysis.key_signals = Array.isArray(analysis.key_signals) ? analysis.key_signals : [];
    analysis.conversion_probability = Number(analysis.conversion_probability) || 0;

    return { success: true, analysis };
  } catch (error) {
    console.error('AI Analyzer error:', error.message);
    // Fallback: treat as qualified so no lead is silently lost
    return {
      success: false,
      analysis: {
        classification: 'qualified',
        classification_reason: 'AI unavailable — manual review recommended',
        lead_score: 30,
        priority: 'low',
        intent: 'General Inquiry',
        service_requested: null,
        urgency: 'Unknown',
        budget_signal: null,
        location: null,
        project_size: 'Unknown',
        summary: 'AI analysis unavailable. Please review this lead manually.',
        conversion_probability: 30,
        estimated_value: null,
        key_signals: ['ai_unavailable'],
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
