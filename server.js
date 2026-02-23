const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// IMPORT THE NEW UNIFIED ROUTE FILE (From Phase 2)
const apiRoutes = require('./routes/apiRoutes');
const globalErrorHandler = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. SECURITY: RATE LIMITER (The Speed Breaker) ---
// This prevents the "Spamming Refresh" crash
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // raised from 100 → handles concurrent normal usage
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', error: 'Too many requests, please try again later.' },
    skip: (req) => req.path === '/favicon.ico' // don't count favicon hits
});

// Apply rate limiting to all requests
app.use(limiter);

// --- 2. MIDDLEWARE ---
app.use(helmet({ contentSecurityPolicy: false })); // Security headers (CSP disabled to allow inline scripts in public HTML)
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // Serves your Frontend (HTML/CSS/JS)

// --- 3. ROUTES (The Brain Upgrade) ---
// We now use the '/api' prefix for all backend logic.
// This keeps your API clean: http://localhost:3000/api/auth/login
app.use('/api', apiRoutes);

// Root route → serve index.html (login page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fix for Favicon Error (Stops browser console warnings)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({ status: 'fail', message: `Route ${req.originalUrl} not found` });
});

// --- 4. GLOBAL ERROR HANDLER ---
// Uses the proper errorMiddleware so AppError statusCodes (400, 401, 404…) are
// forwarded as-is instead of being swallowed into a generic 500.
app.use(globalErrorHandler);

// --- 5. CRASH PREVENTION ---
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.name, err.message);
    // Do NOT exit — keep server alive
});

process.on('unhandledRejection', (err) => {
    console.error('[WARN] Unhandled Rejection:', err ? err.message : err);
    // Do NOT exit — keep server alive
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`[INFO] ENTERPRISE SERVER running on port ${PORT}`);
    console.log(`[INFO] API Ready at http://localhost:${PORT}/api`);
});