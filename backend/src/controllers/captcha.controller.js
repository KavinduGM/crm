const { generateCaptcha } = require('../services/captcha');

async function getCaptchaQuestion(req, res) {
  try {
    const captcha = await generateCaptcha();
    res.json({ success: true, data: captcha });
  } catch (error) {
    console.error('Get captcha error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate captcha' });
  }
}

module.exports = { getCaptchaQuestion };
