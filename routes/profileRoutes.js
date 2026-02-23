const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload-resume', authenticateToken, upload.single('resume'), profileController.uploadResume);

module.exports = router;