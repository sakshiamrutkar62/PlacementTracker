const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Profile Routes
router.get('/me', authenticateToken, authController.getMe);
router.put('/update-password', authenticateToken, authController.updatePassword);

module.exports = router;