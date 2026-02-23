const pool = require('../config/db');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

exports.getCompanies = async (req, res, next) => {
    try {
        // 1. Get User's Skills
        const userResult = await pool.query('SELECT skills FROM users WHERE id = $1', [req.user.id]);
        
        let rawSkills = userResult.rows[0]?.skills;
        let userSkills = [];

        // --- THE FIX: ROBUST PARSING ---
        if (Array.isArray(rawSkills)) {
            userSkills = rawSkills;
        } else if (typeof rawSkills === 'string') {
            // The DB returns: '{"python","java","sql"}'
            // We must remove { } and " characters before splitting
            userSkills = rawSkills
                .replace(/[{}"]/g, '') // Remove curly braces and quotes
                .split(',')            // Split by comma
                .map(s => s.trim())    // Remove extra spaces
                .filter(s => s.length > 0); // Remove empty entries
        }
        // -------------------------------

        console.log("Cleaned User Skills for Matching:", userSkills); // Debug log to verify

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Start Building the Query
        let query = 'SELECT * FROM companies WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        // --- PRIORITY 1: SKILL MATCHING ---
        if (userSkills.length > 0) {
            // Search if Company Role OR Required Skills contain the user's skill
            const skillConditions = userSkills.map((_, i) => 
                `(role ILIKE $${paramIndex + i} OR required_skills ILIKE $${paramIndex + i})`
            ).join(' OR ');
            
            query += ` AND (${skillConditions})`;
            
            userSkills.forEach(skill => params.push(`%${skill}%`));
            paramIndex += userSkills.length;
        }

        // --- FILTERING ---
        const { search, location, min_package } = req.query;

        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR role ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (location) {
            query += ` AND location ILIKE $${paramIndex}`;
            params.push(`%${location}%`);
            paramIndex++;
        }

        if (min_package) {
            query += ` AND package >= $${paramIndex}`;
            params.push(min_package);
            paramIndex++;
        }

        // --- PRIORITY 2: SORTING ---
        query += ` ORDER BY package DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        // Execute
        const result = await pool.query(query, params);
        
        // Count total
        const countQuery = 'SELECT COUNT(*) FROM companies';
        const countResult = await pool.query(countQuery);

        logger.info(`Fetched ${result.rows.length} matched companies`);

        res.json({
            status: 'success',
            results: result.rows.length,
            total: parseInt(countResult.rows[0].count),
            data: result.rows
        });

    } catch (err) {
        console.error("Get Companies Error:", err);
        next(new AppError('Failed to fetch companies', 500));
    }
};

// Add Company (No changes needed)
exports.addCompany = async (req, res, next) => {
    const { name, role, package, location, deadline, required_skills } = req.body;
    try {
        if (!name || !role) {
            return next(new AppError('Company Name and Role are required', 400));
        }

        const result = await pool.query(
            'INSERT INTO companies (name, role, package, location, deadline, required_skills) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, role, package, location, deadline, required_skills]
        );
        
        logger.info(`New company added: ${name}`);
        res.status(201).json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (err) {
        next(new AppError(err.message, 500));
    }
};