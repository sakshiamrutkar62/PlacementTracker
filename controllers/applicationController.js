const pool = require('../config/db');
const AppError = require('../utils/appError');

// 1. Apply for a Job (Student)
exports.apply = async (req, res, next) => {
    const { company_id } = req.body; // In frontend this is the internship ID
    const user_id = req.user.id;

    if (!company_id) return next(new AppError('Internship ID is required', 400));

    try {
        // Check duplication
        const check = await pool.query(
            'SELECT * FROM applications WHERE user_id = $1 AND internship_id = $2',
            [user_id, company_id]
        );

        if (check.rows.length > 0) {
            return next(new AppError('You have already applied to this internship!', 400));
        }

        // Insert
        const newApp = await pool.query(
            'INSERT INTO applications (user_id, internship_id) VALUES ($1, $2) RETURNING *',
            [user_id, company_id]
        );

        res.status(201).json({ status: 'success', data: newApp.rows[0] });
    } catch (err) {
        next(err);
    }
};

// 2. View My Applications (Student)
exports.myApplications = async (req, res, next) => {
    const user_id = req.user.id;
    try {
        let result;
        try {
            result = await pool.query(`
                SELECT 
                    a.id, a.internship_id, a.status, a.applied_at,
                    a.admin_reason,
                    i.company_name,
                    i.role_title as role
                FROM applications a
                JOIN internships i ON a.internship_id = i.id
                WHERE a.user_id = $1
                ORDER BY a.applied_at DESC
            `, [user_id]);
        } catch (_) {
            // Fallback if admin_reason column doesn't exist yet
            result = await pool.query(`
                SELECT 
                    a.id, a.internship_id, a.status, a.applied_at,
                    NULL AS admin_reason,
                    i.company_name,
                    i.role_title as role
                FROM applications a
                JOIN internships i ON a.internship_id = i.id
                WHERE a.user_id = $1
                ORDER BY a.applied_at DESC
            `, [user_id]);
        }
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        next(err);
    }
};

// 3. Withdraw/Delete Application (Student)
exports.withdrawApplication = async (req, res, next) => {
    const { id } = req.params;
    try {
        const deleted = await pool.query('DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
        if (deleted.rowCount === 0) return next(new AppError('Application not found or not authorised', 404));
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

// 4. Update Status (Admin Only)
exports.updateStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    try {
        if (!['Applied', 'Shortlisted', 'Offered', 'Rejected'].includes(status)) {
            return next(new AppError('Invalid status. Must be one of: Applied, Shortlisted, Offered, Rejected', 400));
        }

        let result;
        try {
            // Try with admin_reason column
            result = await pool.query(
                'UPDATE applications SET status = $1, admin_reason = $2 WHERE id = $3 RETURNING *',
                [status, reason || null, id]
            );
        } catch (colErr) {
            // Fallback: column doesn't exist yet — update without reason
            result = await pool.query(
                'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
                [status, id]
            );
        }

        if (result.rows.length === 0) {
            return next(new AppError('Application not found', 404));
        }

        res.status(200).json({ status: 'success', data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

// 5. Get Stats (Student Dashboard)
exports.getStats = async (req, res, next) => {
    // Basic implementation if you need it later
    res.status(200).json({ message: "Stats logic here" });
};

// 6. ADMIN: View All Applications (Fixed to use internships table)
exports.getAllApplications = async (req, res, next) => {
    try {
        let result;
        try {
            result = await pool.query(`
                SELECT 
                    applications.id,
                    applications.status,
                    applications.applied_at,
                    applications.admin_reason,
                    users.full_name AS student_name,
                    users.email AS student_email,
                    users.resume_link,
                    users.verified_skills,
                    internships.company_name,
                    internships.role_title AS role_title,
                    internships.stipend,
                    internships.type
                FROM applications
                JOIN users ON applications.user_id = users.id
                JOIN internships ON applications.internship_id = internships.id
                ORDER BY applications.applied_at DESC
            `);
        } catch (_) {
            result = await pool.query(`
                SELECT 
                    applications.id,
                    applications.status,
                    applications.applied_at,
                    NULL AS admin_reason,
                    users.full_name AS student_name,
                    users.email AS student_email,
                    users.resume_link,
                    users.verified_skills,
                    internships.company_name,
                    internships.role_title AS role_title,
                    internships.stipend,
                    internships.type
                FROM applications
                JOIN users ON applications.user_id = users.id
                JOIN internships ON applications.internship_id = internships.id
                ORDER BY applications.applied_at DESC
            `);
        }
        res.json({ status: 'success', data: result.rows });
    } catch (err) {
        next(err);
    }
};

// 7. Dashboard Stats (Student)
exports.getDashboardStats = async (req, res, next) => {
    const user_id = req.user.id;
    try {
        const appsResult = await pool.query(
            'SELECT status FROM applications WHERE user_id = $1', [user_id]
        );
        const apps = appsResult.rows;

        const userResult = await pool.query(
            'SELECT verified_skills, skills, resume_link FROM users WHERE id = $1', [user_id]
        );
        const userData = userResult.rows[0] || {};

        const verifiedCount = (userData.verified_skills || []).length;
        const skillsCount = (userData.skills || []).length;
        const hasResume = !!userData.resume_link;

        // Profile score algorithm
        let profileScore = 0;
        if (hasResume) profileScore += 30;
        profileScore += Math.min(verifiedCount * 10, 40); // max 40 from verified skills
        profileScore += Math.min(skillsCount * 2, 20);    // max 20 from raw skills
        profileScore = Math.min(profileScore, 100);

        res.json({
            status: 'success',
            data: {
                total: apps.length,
                shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
                offered: apps.filter(a => a.status === 'Offered').length,
                rejected: apps.filter(a => a.status === 'Rejected').length,
                verifiedSkills: verifiedCount,
                profileScore
            }
        });
    } catch (err) {
        next(err);
    }
};