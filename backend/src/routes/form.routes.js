const express = require('express');
const router = express.Router();
const {
  getForBusiness, getOne, create, update, remove, generateAiQuestions
} = require('../controllers/form.controller');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/business/:businessId', getForBusiness);
router.get('/:id', getOne);
router.post('/business/:businessId', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/generate-ai-questions', generateAiQuestions);

module.exports = router;
