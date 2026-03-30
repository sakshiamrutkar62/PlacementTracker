const express = require('express');
const router = express.Router();
const multer = require('multer');

// Middleware
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this file exists
const upload = multer({ storage: multer.memoryStorage() }); // Handles PDF uploads in memory

// Controllers
const internshipController = require('../controllers/internshipController');
const aiController = require('../controllers/aiController');
const skillController = require('../controllers/skillController');
const authController = require('../controllers/authController');
const applicationController = require('../controllers/applicationController');
const profileController = require('../controllers/profileController');
const adminController = require('../controllers/adminController');

// --- AUTH ROUTES ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/me', authMiddleware.protect, authController.getMe);
router.patch('/auth/update-password', authMiddleware.protect, authController.updatePassword);

// --- INTERNSHIP ROUTES ---
// Apply optional auth - if authenticated, match ratios are included
const optionalAuth = (req, res, next) => {
    // This middleware now correctly uses optionalProtect for optional authentication.
    // If a valid token is provided, req.user will be set.
    // If the token is invalid or missing, the request proceeds without authentication.
    return authMiddleware.optionalProtect(req, res, next);
};
router.get('/companies', optionalAuth, internshipController.getAllInternships);      // Legacy alias
router.get('/internships', optionalAuth, internshipController.getAllInternships);     // Returns match ratios if user is authenticated
router.get('/internships/search', internshipController.searchInternships);
router.post('/internships', authMiddleware.protect, internshipController.createInternship);

// --- APPLICATION ROUTES ---
router.post('/applications', authMiddleware.protect, applicationController.apply);
router.get('/applications/my', authMiddleware.protect, applicationController.myApplications);
router.delete('/applications/:id', authMiddleware.protect, applicationController.withdrawApplication);

// --- ADMIN ROUTES ---
router.get('/applications/admin-view', authMiddleware.protect, applicationController.getAllApplications);
router.put('/applications/:id/status', authMiddleware.protect, applicationController.updateStatus);

// --- STATS ---
router.get('/stats/dashboard', authMiddleware.protect, applicationController.getDashboardStats);

// --- PROFILE ROUTES ---
router.get('/profile/me', authMiddleware.protect, profileController.getProfile);
router.post('/profile/upload-resume', authMiddleware.protect, upload.single('resume'), profileController.uploadResume);

// --- AI ROUTES ---
router.post('/ai/quiz', aiController.generateQuiz);
router.post('/ai/feedback', aiController.getFeedback);
router.post('/ai/skill-gap', authMiddleware.protect, aiController.getSkillGap);

// --- SKILL ROUTES ---
router.post('/skills/submit', authMiddleware.protect, skillController.submitQuiz);
router.get('/skills/history', authMiddleware.protect, skillController.getQuizHistory);

// --- ADMIN STUDENT MANAGEMENT ---
router.get('/admin/students', authMiddleware.protect, adminController.listStudents);
router.get('/admin/rankings', authMiddleware.protect, adminController.getStudentRankings);
router.put('/admin/students/:id/verify', authMiddleware.protect, adminController.verifyStudent);
router.post('/admin/applications', authMiddleware.protect, adminController.createApplicationForStudent);

module.exports = router;
