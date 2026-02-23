const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, companyController.getCompanies);
router.post('/', companyController.addCompany); // Add 'authenticateToken' here if you want only admins to add

module.exports = router;