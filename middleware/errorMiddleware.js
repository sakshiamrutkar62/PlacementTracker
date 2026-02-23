const logger = require('../utils/logger');

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error for developer but send clean message to user
    logger.error(err.message, err.stack);

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        // Only show stack trace in development, not production
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
    });
};

module.exports = globalErrorHandler;