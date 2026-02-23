const pool = require('../config/db');
const AppError = require('../utils/appError');

// GET /api/admin/students — list all students for admin
exports.listStudents = async (req, res, next) => {
    if (req.user.role !== 'admin') return next(new AppError('Forbidden', 403));
    try {
        // college_verified column may not exist yet — use a safe COALESCE fallback
        const result = await pool.query(
            `SELECT id, full_name, email, role, batch_year, department, cgpa,
                    COALESCE(college_verified, false) AS college_verified,
                    verified_skills, skills, resume_link, created_at
             FROM users
             WHERE role = 'student'
             ORDER BY full_name ASC`
        );
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        // If college_verified column truly doesn't exist, fall back without it
        if (err.message && err.message.includes('college_verified')) {
            try {
                const result = await pool.query(
                    `SELECT id, full_name, email, role, batch_year, department, cgpa,
                            false AS college_verified,
                            verified_skills, skills, resume_link, created_at
                     FROM users WHERE role = 'student' ORDER BY full_name ASC`
                );
                return res.json({ status: 'success', data: result.rows });
            } catch (fallbackErr) { return next(fallbackErr); }
        }
        next(err);
    }
};

// PUT /api/admin/students/:id/verify — toggle college verification badge
exports.verifyStudent = async (req, res, next) => {
    if (req.user.role !== 'admin') return next(new AppError('Forbidden', 403));
    const { id } = req.params;
    const { college_verified } = req.body; // true or false

    try {
        const result = await pool.query(
            'UPDATE users SET college_verified = $1 WHERE id = $2 AND role = \'student\' RETURNING id, full_name, email, college_verified',
            [college_verified === true || college_verified === 'true', id]
        );
        if (result.rows.length === 0) return next(new AppError('Student not found', 404));
        res.json({ status: 'success', data: result.rows[0] });
    } catch (err) { next(err); }
};

// POST /api/admin/applications — create application on behalf of a student
exports.createApplicationForStudent = async (req, res, next) => {
    if (req.user.role !== 'admin') return next(new AppError('Forbidden', 403));
    const { student_id, internship_id } = req.body;
    if (!student_id || !internship_id) return next(new AppError('student_id and internship_id are required', 400));

    try {
        // Check duplicate
        const check = await pool.query(
            'SELECT id FROM applications WHERE user_id = $1 AND internship_id = $2',
            [student_id, internship_id]
        );
        if (check.rows.length > 0) {
            return next(new AppError('This student has already applied to this internship.', 400));
        }

        const result = await pool.query(
            'INSERT INTO applications (user_id, internship_id, status) VALUES ($1, $2, \'Applied\') RETURNING *',
            [student_id, internship_id]
        );
        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (err) { next(err); }
};
