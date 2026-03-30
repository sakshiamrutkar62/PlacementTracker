const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    // This is a critical configuration error. The application should not start without a JWT secret.
    // Throwing an error here will prevent the server from running in an insecure state.
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
}

exports.protect = async (req, res, next) => {
    let token;

    try {
        token = req.headers['authorization']?.split(' ')[1];
    } catch (err) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    try {
        // Use the validated JWT_SECRET from the top of the file.
        const decoded = jwt.verify(token, JWT_SECRET);

        const currentUser = await User.findByPk(decoded.id);

        if (!currentUser) {
            return next(new AppError('Invalid token. Please log in again.', 401));
        }

        req.user = currentUser;
        next();
    } catch (err) {
        // Provide a clearer error message for invalid tokens.
        return next(new AppError('Invalid token. Please log in again.', 401));
    }
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('You do not have the permission to perform this action.', 403));
        }
        next();
    };
};