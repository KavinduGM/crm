/**
 * Lead Scoring Engine — Rule-based with weighted factors
 * Score range: 0–100
 * Priority: High (70–100), Medium (40–69), Low (0–39)
 */

const URGENCY_KEYWORDS = [
  'urgent', 'asap', 'immediately', 'emergency', 'today', 'right now',
  'as soon as possible', 'within 24', 'tonight', 'this morning', 'critical',
];

const STRONG_INTENT_KEYWORDS = [
  'quotation', 'quote', 'price', 'cost', 'how much', 'looking to hire',
  'need installation', 'want to book', 'can you visit', 'schedule',
  'start next', 'begin work', 'get started', 'ready to proceed',
];

const WEAK_INTENT_KEYWORDS = [
  'just exploring', 'wondering', 'maybe', 'thinking about',
  'not sure', 'sometime', 'in the future', 'general information',
  'just curious', 'some information',
];

const BUDGET_PATTERN = /\$[\d,]+|\£[\d,]+|€[\d,]+|\d+k|\d+,\d{3}|\b(budget|spend|pay|invest)\b/gi;

function normalize(text) {
  return (text || '').toLowerCase();
}

function buildMessageText(lead) {
  const parts = [lead.message || ''];
  if (Array.isArray(lead.answers)) {
    lead.answers.forEach(a => parts.push(a.answer || ''));
  }
  return normalize(parts.join(' '));
}

/**
 * @param {Object} lead - raw lead data
 * @param {Object} aiAnalysis - from Layer 3 AI analyzer
 * @param {Object} businessContext - { services, industry }
 * @returns {{ score: number, priority: string, breakdown: Object }}
 */
function scoreLead(lead, aiAnalysis, businessContext = {}) {
  const text = buildMessageText(lead);
  const breakdown = {};

  // ================================================================
  // 1. Service Relevance (30 points)
  // ================================================================
  let serviceScore = 5; // default for low relevance
  const relevance = aiAnalysis?.service_relevance || 'Medium';
  if (relevance === 'High') {
    serviceScore = 30;
  } else if (relevance === 'Medium') {
    serviceScore = 15;
  } else {
    // Try keyword matching against business services
    const services = (businessContext.services || '').toLowerCase();
    const serviceWords = services.split(',').map(s => s.trim()).filter(Boolean);
    const messageRelevant = serviceWords.some(svc => text.includes(svc));
    serviceScore = messageRelevant ? 20 : 5;
  }
  breakdown.service_relevance = serviceScore;

  // ================================================================
  // 2. Intent Strength (20 points)
  // ================================================================
  let intentScore = 5;
  const aiIntent = normalize(aiAnalysis?.intent || '');

  if (aiIntent.includes('quote') || aiIntent.includes('emergency')) {
    intentScore = 20;
  } else if (aiIntent.includes('service request')) {
    intentScore = 18;
  } else if (aiIntent.includes('information')) {
    intentScore = 8;
  }

  // Override with keyword detection on the raw message
  const hasStrongIntent = STRONG_INTENT_KEYWORDS.some(kw => text.includes(kw));
  const hasWeakIntent = WEAK_INTENT_KEYWORDS.some(kw => text.includes(kw));

  if (hasStrongIntent) intentScore = Math.max(intentScore, 20);
  if (hasWeakIntent) intentScore = Math.min(intentScore, 8);

  breakdown.intent_strength = intentScore;

  // ================================================================
  // 3. Urgency (15 points)
  // ================================================================
  let urgencyScore = 5;
  const aiUrgency = normalize(aiAnalysis?.urgency || '');

  if (aiUrgency.includes('immediate') || aiUrgency.includes('24 hour') || aiUrgency.includes('emergency')) {
    urgencyScore = 15;
  } else if (aiUrgency.includes('week')) {
    urgencyScore = 12;
  } else if (aiUrgency.includes('month')) {
    urgencyScore = 8;
  } else if (aiUrgency.includes('planning')) {
    urgencyScore = 5;
  }

  // Double-check with keyword matching
  const hasUrgency = URGENCY_KEYWORDS.some(kw => text.includes(kw));
  if (hasUrgency) urgencyScore = Math.max(urgencyScore, 12);

  breakdown.urgency = urgencyScore;

  // ================================================================
  // 4. Budget Indicators (15 points)
  // ================================================================
  let budgetScore = 5;
  const hasBudget = aiAnalysis?.budget_signal || BUDGET_PATTERN.test(text);
  if (hasBudget) {
    budgetScore = 15;
    BUDGET_PATTERN.lastIndex = 0;
  }
  breakdown.budget_signals = budgetScore;

  // ================================================================
  // 5. Location Fit (10 points)
  // ================================================================
  let locationScore = 5; // Default medium (no location tracking yet)
  if (aiAnalysis?.location) {
    locationScore = 10; // Has detectable location = more qualified
  }
  breakdown.location_fit = locationScore;

  // ================================================================
  // 6. Message Quality (10 points)
  // ================================================================
  const messageLength = text.length;
  let qualityScore = 2;
  if (messageLength > 200) qualityScore = 10;
  else if (messageLength > 80) qualityScore = 7;
  else if (messageLength > 30) qualityScore = 4;
  breakdown.message_quality = qualityScore;

  // ================================================================
  // TOTAL SCORE
  // ================================================================
  const totalScore = Math.min(
    serviceScore + intentScore + urgencyScore + budgetScore + locationScore + qualityScore,
    100
  );

  // ================================================================
  // PRIORITY CLASSIFICATION
  // ================================================================
  let priority;
  if (totalScore >= 70) priority = 'high';
  else if (totalScore >= 40) priority = 'medium';
  else priority = 'low';

  return {
    score: totalScore,
    priority,
    breakdown,
  };
}

module.exports = { scoreLead };
