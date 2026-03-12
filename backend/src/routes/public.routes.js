const express = require('express');
const router = express.Router();
const {
  getPublicForm, submitStandardForm, startAiSession, sendAiMessage
} = require('../controllers/public.controller');

// Public routes - no auth required
router.get('/:company_slug', getPublicForm);
router.post('/:company_slug/submit', submitStandardForm);
router.post('/:company_slug/ai/start', startAiSession);
router.post('/ai/message', sendAiMessage);

module.exports = router;
