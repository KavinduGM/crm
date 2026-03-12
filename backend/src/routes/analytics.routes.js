const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getSummary } = require('../controllers/analytics.controller');

router.use(authMiddleware);
router.get('/summary', getSummary);

module.exports = router;
