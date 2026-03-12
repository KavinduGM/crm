const express = require('express');
const router = express.Router();
const { getAll, getOne, remove, getStats } = require('../controllers/lead.controller');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/stats', getStats);
router.get('/', getAll);
router.get('/:id', getOne);
router.delete('/:id', remove);

module.exports = router;
