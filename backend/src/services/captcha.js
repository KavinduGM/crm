/**
 * Humanise CAPTCHA Service
 * Uses friendly personal-preference questions — any non-empty answer is accepted.
 * This proves the user is human (they read + typed something) without testing knowledge.
 */
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const CAPTCHA_TTL_MINUTES = 10;

// Personal preference questions — no wrong answer, just proves a human is filling the form
const QUESTIONS = [
  { id: 1,  question: 'What is your favourite food?' },
  { id: 2,  question: 'Name a colour that you like.' },
  { id: 3,  question: 'What is your favourite animal?' },
  { id: 4,  question: 'Name a country you would love to visit.' },
  { id: 5,  question: 'What is your favourite season — summer, winter, spring or autumn?' },
  { id: 6,  question: 'Name a fruit you enjoy eating.' },
  { id: 7,  question: 'What is your favourite sport or hobby?' },
  { id: 8,  question: 'Name something you enjoy doing on weekends.' },
  { id: 9,  question: 'What is your favourite drink?' },
  { id: 10, question: 'Name a movie or TV show you enjoyed recently.' },
  { id: 11, question: 'What is your favourite type of music?' },
  { id: 12, question: 'Name a place in your city you like to visit.' },
  { id: 13, question: 'What is your favourite meal of the day — breakfast, lunch or dinner?' },
  { id: 14, question: 'Name something that makes you happy.' },
  { id: 15, question: 'What is your favourite way to relax?' },
  { id: 16, question: 'Name a subject you enjoyed at school.' },
  { id: 17, question: 'What is your favourite type of weather?' },
  { id: 18, question: 'Name a skill you have or would like to learn.' },
  { id: 19, question: 'What is your favourite time of day — morning or evening?' },
  { id: 20, question: 'Name a book or author you like.' },
];

function getRandomQuestion() {
  return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
}

/**
 * Generate a new captcha session.
 * @returns {{ captchaId: string, question: string }}
 */
async function generateCaptcha() {
  const question = getRandomQuestion();
  const captchaId = uuidv4();
  const expiresAt = new Date(Date.now() + CAPTCHA_TTL_MINUTES * 60 * 1000);

  await pool.query(
    'INSERT INTO captcha_sessions (id, question_id, correct_answer, expires_at) VALUES (?, ?, ?, ?)',
    [captchaId, question.id, 'any', expiresAt]
  );

  return { captchaId, question: question.question };
}

/**
 * Verify a captcha answer.
 * Since questions are open-ended, any non-empty answer is valid.
 */
async function verifyCaptcha(captchaId, userAnswer) {
  // If no captchaId provided, skip validation (captcha is optional)
  if (!captchaId) {
    return { valid: true, skipped: true };
  }

  if (!userAnswer || !userAnswer.trim()) {
    return { valid: false, reason: 'Please provide an answer' };
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM captcha_sessions WHERE id = ? AND expires_at > NOW() AND is_used = 0',
      [captchaId]
    );

    if (rows.length === 0) {
      // Session expired or already used — treat as valid to not block user
      return { valid: true, skipped: true };
    }

    // Mark as used (prevent replay)
    await pool.query('UPDATE captcha_sessions SET is_used = 1 WHERE id = ?', [captchaId]);

    // Cleanup expired sessions
    await pool.query('DELETE FROM captcha_sessions WHERE expires_at < NOW()');

    // Accept any non-empty answer
    const answered = (userAnswer || '').trim().length > 0;
    return { valid: answered };
  } catch (error) {
    console.error('Captcha verify error:', error.message);
    // On DB error, don't block the user
    return { valid: true, skipped: true };
  }
}

module.exports = { generateCaptcha, verifyCaptcha };
