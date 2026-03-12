const express = require('express');
const router = express.Router();
const { uploadLogo } = require('../controllers/upload.controller');
const { authMiddleware } = require('../middleware/auth');

router.post('/logo', authMiddleware, uploadLogo);

module.exports = router;
