/**
 * LAYER 2 — Intent Filter (Sales Pitch / Marketing Outreach Detection)
 * Rule-based, zero AI cost. Catches B2B outreach that is NOT spam.
 * Returns: { isSalesPitch, confidence, reasons }
 */

// Marketing / sales outreach phrase patterns
const SALES_PITCH_PATTERNS = [
  { pattern: /\b(we help (businesses|companies|clients))\b/gi, weight: 2, label: 'generic sales claim' },
  { pattern: /\b(increase your (traffic|sales|revenue|conversions|leads))\b/gi, weight: 2, label: 'growth pitch' },
  { pattern: /\b(our (service|solution|platform|software|product|team|agency) (can|will|helps?))\b/gi, weight: 2, label: 'agency pitch' },
  { pattern: /\b(guest post|content partner|sponsored (post|content|article))\b/gi, weight: 3, label: 'guest post outreach' },
  { pattern: /\b(backlink|link exchange|link building|link insertion)\b/gi, weight: 3, label: 'link building pitch' },
  { pattern: /\b(digital marketing|social media management|PPC campaign|google ads management)\b/gi, weight: 1, label: 'marketing services pitch' },
  { pattern: /\b(I (represent|work with|am from)|on behalf of (my|our) (company|client|agency))\b/gi, weight: 2, label: 'agency representative' },
  { pattern: /\b(white-?label|outsource|sub-?contract)\b/gi, weight: 2, label: 'white-label pitch' },
  { pattern: /\b(mutual (benefit|partnership)|synergy|collaborate together)\b/gi, weight: 2, label: 'partnership buzzwords' },
  { pattern: /\b(influencer|brand ambassador|product review|affiliate (partner|program))\b/gi, weight: 2, label: 'influencer pitch' },
  { pattern: /\b(cold email|outreach (campaign|specialist)|sales (funnel|pipeline))\b/gi, weight: 3, label: 'sales operations' },
  { pattern: /\b(PR (outreach|campaign|agency)|press release|media (coverage|opportunity))\b/gi, weight: 2, label: 'PR pitch' },
];

// Call-to-action signatures that indicate sales outreach
const CTA_PATTERNS = [
  { pattern: /calendly\.com|cal\.com|tidycal\.com|acuityscheduling\.com/gi, weight: 3, label: 'scheduling link' },
  { pattern: /\b(schedule a (call|meeting|demo|discovery call))\b/gi, weight: 3, label: 'schedule CTA' },
  { pattern: /\b(book a (free |15[-\s]?min|30[-\s]?min|demo|call|consultation))\b/gi, weight: 3, label: 'booking CTA' },
  { pattern: /\b(let[''`]?s (hop on a call|connect|chat|talk))\b/gi, weight: 2, label: 'connection CTA' },
  { pattern: /\b(would you be (open|interested|willing) to)\b/gi, weight: 2, label: 'soft pitch opener' },
  { pattern: /\b(free (audit|consultation|proposal|analysis|strategy session))\b/gi, weight: 2, label: 'free offer bait' },
  { pattern: /\b(reply (to this|and I|if you[''`]?re interested))\b/gi, weight: 1, label: 'reply CTA' },
];

// Marketing-related domain patterns
const MARKETING_DOMAIN_PATTERNS = [
  /marketing/, /\bseo\b/, /digital/, /\bads?\b/, /growth/, /\bagency\b/,
  /outreach/, /lead(s|gen)/, /traffic/, /social(media)?/, /content/, /media/,
  /promote/, /advertis/, /backlink/, /promo/,
];

function getEmailDomain(email) {
  if (!email) return '';
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

function buildMessageText(lead) {
  const parts = [lead.name || '', lead.message || ''];
  if (Array.isArray(lead.answers)) {
    lead.answers.forEach(a => parts.push(a.answer || ''));
  }
  return parts.join(' ');
}

/**
 * @param {Object} lead - { name, email, message, answers }
 * @returns {{ isSalesPitch: boolean, confidence: number, reasons: string[] }}
 */
function runIntentFilter(lead) {
  let weight = 0;
  const reasons = [];
  const text = buildMessageText(lead);
  const domain = getEmailDomain(lead.email);

  // --- Sales pitch phrase detection ---
  for (const { pattern, weight: w, label } of SALES_PITCH_PATTERNS) {
    if (pattern.test(text)) {
      weight += w;
      reasons.push(label);
      pattern.lastIndex = 0;
    }
  }

  // --- CTA / scheduling signature detection ---
  for (const { pattern, weight: w, label } of CTA_PATTERNS) {
    if (pattern.test(text)) {
      weight += w;
      reasons.push(label);
      pattern.lastIndex = 0;
    }
  }

  // --- Marketing domain detection ---
  if (domain) {
    const domainName = domain.split('.')[0];
    const isMarketingDomain = MARKETING_DOMAIN_PATTERNS.some(p => p.test(domainName));
    if (isMarketingDomain) {
      weight += 2;
      reasons.push(`marketing_domain:${domain}`);
    }
  }

  // --- First-person business intro patterns ---
  if (/^(Hi|Hello|Dear|Good (morning|afternoon|day)),?\s+(my name is|I[''`]?m)\b/gi.test(text)) {
    weight += 1;
    reasons.push('cold_email_opener');
  }

  // Convert weight to confidence score (0-100)
  const confidence = Math.min(weight * 12, 100);

  return {
    isSalesPitch: weight >= 4, // threshold = 4 weight points
    confidence,
    reasons,
  };
}

module.exports = { runIntentFilter };
