const logger = require('../utils/logger');

// Custom Error Class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_ERROR';
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Log the error
  if (err.statusCode === 500) {
    logger.error('Unhandled Error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user ? req.user._id : null,
    });
  } else if (err.statusCode >= 400 && err.statusCode < 500) {
    logger.warn('Client Error', {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // Mongoose Duplicate Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      status: 'error',
      code: 'DUPLICATE_ENTRY',
      message: `${field} already exists`,
      field,
      timestamp: new Date().toISOString(),
    });
  }

  // Mongoose Cast Error
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_ID',
      message: 'Invalid ID format',
      timestamp: new Date().toISOString(),
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid or malformed token',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired',
      timestamp: new Date().toISOString(),
    });
  }

  // AppError - Controlled errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode < 500 ? 'error' : 'error',
      code: err.code,
      message: err.message,
      timestamp: err.timestamp,
    });
  }

  // Unknown error - don't expose internals in production
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.statusCode).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: isProduction ? 'Something went wrong' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

// Async error wrapper - use this for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, asyncHandler };
