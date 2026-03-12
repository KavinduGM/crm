const express = require('express');
const router = express.Router();
const { getCaptchaQuestion } = require('../controllers/captcha.controller');

// Public — no auth needed
router.get('/question', getCaptchaQuestion);

module.exports = router;
