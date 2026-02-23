const express = require('express');
const router = express.Router();
const appController = require('../controllers/applicationController');
const authenticateToken = require('../middleware/authMiddleware');

// Student Routes
router.post('/', authenticateToken, appController.apply);
router.get('/my', authenticateToken, appController.myApplications);
router.delete('/:id', authenticateToken, appController.withdrawApplication);
router.put('/:id/status', authenticateToken, appController.updateStatus);
router.get('/stats', authenticateToken, appController.getStats);

// Admin Route to view all applications
router.get('/admin-view', authenticateToken, appController.getAllApplications);

module.exports = router;