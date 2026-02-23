const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const sendEmail = require('../config/email');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret';

exports.register = async (req, res) => {
    const { full_name, email, password, role } = req.body;

    try {
        // 1. Check if user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert User (NOW INCLUDES full_name)
        // FIX: Use password_hash column to match login check
        const newUser = await pool.query(
            'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
            [full_name, email, hashedPassword, role || 'student']
        );

        // 4. Generate Token
        // FIX: Use SECRET_KEY with fallback and use saved role from database
        const token = jwt.sign({ id: newUser.rows[0].id, role: newUser.rows[0].role }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ token, user: newUser.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during registration" });
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];

        // FIX: Add null check for password_hash before bcrypt.compare and support legacy users
        // Support legacy users who might have password in 'password' column instead of 'password_hash'
        const passwordToCheck = user?.password_hash || user?.password;
        if (!user || !passwordToCheck) {
            return next(new AppError('Invalid credentials', 401));
        }

        const isPasswordValid = await bcrypt.compare(password, passwordToCheck);
        if (!isPasswordValid) {
            return next(new AppError('Invalid credentials', 401));
        }

        // If user has password in legacy 'password' column, migrate it to password_hash
        if (user.password && !user.password_hash) {
            await pool.query('UPDATE users SET password_hash = $1, password = NULL WHERE id = $2', [user.password, user.id]);
        }

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.full_name, role: user.role } });
    } catch (err) {
        next(err);
    }
};

// NEW: Get Current User Profile
exports.getMe = async (req, res, next) => {
    try {
        const user = await pool.query('SELECT id, full_name, email, role, resume_link, batch_year FROM users WHERE id = $1', [req.user.id]);
        if (!user.rows[0]) return next(new AppError('User no longer exists', 404));

        res.json({ status: 'success', data: user.rows[0] });
    } catch (err) { next(err); }
};

// NEW: Update Password
exports.updatePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];

        if (!user) return next(new AppError('User not found', 404));

        // FIX: Check password_hash exists and add fallback for legacy users with password column
        const passwordToCheck = user.password_hash || user.password;
        if (!passwordToCheck) return next(new AppError('No password set for this user', 400));

        const isMatch = await bcrypt.compare(currentPassword, passwordToCheck);
        if (!isMatch) return next(new AppError('Incorrect current password', 401));

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1, password = NULL WHERE id = $2', [newHash, req.user.id]);

        logger.info(`Password updated for user: ${user.email}`);
        res.json({ status: 'success', message: 'Password updated successfully!' });
    } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    try {
        const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
        if (!user) return next(new AppError('User not found', 404));

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000);

        await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [resetToken, tokenExpiry, user.id]);

        const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        await sendEmail(email, 'Password Reset', `Click to reset: ${resetLink}`);

        res.json({ message: 'Reset link sent to email.' });
    } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
    const { token, newPassword } = req.body;
    try {
        const user = (await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()', [token])).rows[0];
        if (!user) return next(new AppError('Invalid or expired token', 400));

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2', [newHash, user.id]);

        res.json({ message: 'Password reset successful.' });
    } catch (err) { next(err); }
};