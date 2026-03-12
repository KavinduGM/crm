/**
 * LAYER 1 — Rule-Based Spam Filter
 * Zero AI cost. Pure regex, keyword, and domain analysis.
 * Returns: { isSpam, score, reasons }
 */

// Known disposable email domain list
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'spam4.me', 'trashmail.com', 'trashmail.me',
  'dispostable.com', 'fakeinbox.com', 'maildrop.cc', 'discard.email',
  'spamgourmet.com', 'mailnull.com', 'spamfree24.org', 'notmailinator.com',
  'tempr.email', 'dispostable.com', 'getnada.com', 'throwam.com',
  'temp-mail.org', 'temp-mail.io', 'emailondeck.com', 'mail-temporaire.fr',
  'burnermail.io', 'mailtemp.net', 'spamhereplease.com', 'getairmail.com',
  'moakt.com', 'mohmal.com', 'mytemp.email', 'safetymail.info',
]);

// Blacklisted spam keywords (weighted)
const SPAM_KEYWORDS = [
  { pattern: /\b(crypto|bitcoin|ethereum|nft|blockchain)\b/gi, score: 25, label: 'crypto keywords' },
  { pattern: /\b(casino|gambling|slot|poker|betting|lottery)\b/gi, score: 30, label: 'gambling keywords' },
  { pattern: /\b(loan offer|payday loan|quick loan|easy money|fast cash)\b/gi, score: 30, label: 'loan offer' },
  { pattern: /\b(seo service|backlink|link building|rank your site|search engine ranking)\b/gi, score: 25, label: 'SEO spam' },
  { pattern: /\b(adult|xxx|porn|escort|onlyfans)\b/gi, score: 40, label: 'adult content' },
  { pattern: /\b(viagra|cialis|pharmacy|prescription medication)\b/gi, score: 35, label: 'pharma spam' },
  { pattern: /\b(make money fast|earn \$[\d]+|passive income system)\b/gi, score: 30, label: 'money scheme' },
  { pattern: /\b(investment opportunity|guaranteed return|double your money)\b/gi, score: 25, label: 'investment spam' },
  { pattern: /\b(click here|urgent reply|act now|limited time offer)\b/gi, score: 15, label: 'spam trigger phrases' },
  { pattern: /\b(weight loss|diet pill|fat burner|keto supplement)\b/gi, score: 20, label: 'health spam' },
  { pattern: /winner|congratulations.*prize|claim.*reward/gi, score: 30, label: 'prize scam' },
];

// URL/link detection regex
const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const MULTIPLE_URLS_THRESHOLD = 2;

// Suspicious TLDs often used in spam
const SUSPICIOUS_TLDS = /\.(xyz|top|click|loan|win|gq|tk|ml|cf|ga|info)\b/gi;

// Excessive capitalization (SHOUTING) detection
function hasExcessiveCaps(text) {
  if (!text || text.length < 20) return false;
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  return letterCount > 0 && (upperCount / letterCount) > 0.6;
}

// Email domain extraction
function getEmailDomain(email) {
  if (!email) return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase().trim() : null;
}

/**
 * @param {Object} lead - { name, email, phone, message, answers }
 * @param {Object} opts - { domainWhitelist: Set<string> }
 * @returns {{ isSpam: boolean, score: number, reasons: string[] }}
 */
function runSpamFilter(lead, opts = {}) {
  let score = 0;
  const reasons = [];
  const text = buildMessageText(lead);

  // --- Honeypot check (instant disqualify) ---
  if (lead.honeypot && lead.honeypot.trim() !== '') {
    return { isSpam: true, score: 100, reasons: ['honeypot_triggered'] };
  }

  // --- Disposable email domain ---
  const domain = getEmailDomain(lead.email);
  if (domain) {
    // Check whitelist first (learned from mark-not-spam)
    const whitelist = opts.domainWhitelist || new Set();
    if (!whitelist.has(domain) && DISPOSABLE_DOMAINS.has(domain)) {
      score += 40;
      reasons.push('disposable_email_domain');
    }
  }

  // --- Missing email ---
  if (!lead.email || !lead.email.includes('@')) {
    score += 20;
    reasons.push('invalid_email');
  }

  // --- Link density ---
  const links = text.match(URL_PATTERN) || [];
  if (links.length > MULTIPLE_URLS_THRESHOLD) {
    score += 30;
    reasons.push(`high_link_density:${links.length}_links`);
  }

  // --- Suspicious TLDs in links ---
  if (SUSPICIOUS_TLDS.test(text)) {
    score += 15;
    reasons.push('suspicious_url_tld');
  }

  // --- Spam keywords ---
  for (const kw of SPAM_KEYWORDS) {
    if (kw.pattern.test(text)) {
      score += kw.score;
      reasons.push(kw.label);
      kw.pattern.lastIndex = 0; // Reset regex state
    }
  }

  // --- Excessive capitalization ---
  if (hasExcessiveCaps(text)) {
    score += 10;
    reasons.push('excessive_capitalization');
  }

  // --- Very short or empty message ---
  if (!text || text.trim().length < 5) {
    score += 10;
    reasons.push('empty_or_too_short');
  }

  // --- Gibberish name detection ---
  if (lead.name && /^[a-z]{2,}\d{3,}$/i.test(lead.name.trim())) {
    score += 15;
    reasons.push('suspicious_name_pattern');
  }

  // Cap at 100
  score = Math.min(score, 100);

  return {
    isSpam: score >= 50,
    score,
    reasons,
  };
}

function buildMessageText(lead) {
  const parts = [lead.name || '', lead.message || ''];
  if (Array.isArray(lead.answers)) {
    lead.answers.forEach(a => parts.push(a.answer || ''));
  }
  return parts.join(' ');
}

module.exports = { runSpamFilter };
