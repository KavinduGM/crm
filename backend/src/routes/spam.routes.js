const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getSpamLeads, getSpamLeadDetail, markNotSpam, deleteSpamLead, deleteAllSpam,
} = require('../controllers/spam.controller');

router.use(authMiddleware);

router.get('/', getSpamLeads);
router.get('/:id', getSpamLeadDetail);
router.post('/:id/mark-not-spam', markNotSpam);
router.delete('/business/:businessId/all', deleteAllSpam);
router.delete('/:id', deleteSpamLead);

module.exports = router;
