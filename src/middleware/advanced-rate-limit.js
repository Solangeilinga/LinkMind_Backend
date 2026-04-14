const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ================================================
// AUTH RATE LIMITER - 5 tentatives par 15 minutes
// ================================================
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: {
    error: 'Too many login attempts',
    code: 'AUTH_RATE_LIMIT',
    retryAfter: 15 * 60
  },
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by email/phone + IP to prevent distributed attacks
    const identifier = req.body.email || req.body.phone || 'unknown';
    return `auth:${identifier}:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      identifier: req.body.email || req.body.phone,
      ip: req.ip,
    });
    
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Too many login attempts',
      code: 'AUTH_RATE_LIMIT',
      retryAfter,
      resetTime: new Date(req.rateLimit.resetTime).toISOString(),
    });
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

// ================================================
// PASSWORD RESET LIMITER - 3 tentatives par 1 heure
// ================================================
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,
  message: 'Too many password reset requests',
  keyGenerator: (req) => {
    return `pwd:${req.body.email}:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Password reset rate limit exceeded', {
      email: req.body.email,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many password reset requests',
      code: 'PWD_RESET_RATE_LIMIT'
    });
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

// ================================================
// API GENERAL LIMITER - 100 req/15min pour gratuit, 1000 pour premium
// ================================================
exports.apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: (req) => {
    // Premium users have higher limits
    if (req.user && req.user.isPremium) {
      return 1000;
    }
    return 300;
  },
  message: 'Too many requests',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      userId: req.user ? req.user._id : null,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many requests',
      code: 'API_RATE_LIMIT',
      retryAfter: 15 * 60
    });
  },
});

// ================================================
// MINDO AI LIMITER - 10/heure gratuit, illimité premium
// ================================================
exports.mindoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: (req) => {
    if (req.user && req.user.isPremium) {
      return 1000;  // Unlimited essentially
    }
    return 10;  // 10 messages/hour for free
  },
  keyGenerator: (req) => `mindo:${req.user._id}`,
  message: 'Mindo message limit reached',
  handler: (req, res) => {
    logger.info('Mindo rate limit hit', {
      userId: req.user._id,
      isPremium: req.user.isPremium,
    });
    res.status(429).json({
      error: 'Daily message limit reached',
      code: 'MINDO_LIMIT',
      message: req.user.isPremium 
        ? 'Unexpected error' 
        : 'Upgrade to premium for unlimited messages',
      retryAfter: 60 * 60  // 1 hour
    });
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

// ================================================
// POST CREATION LIMITER - 20 posts/heure max
// ================================================
exports.postCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,
  keyGenerator: (req) => `post:${req.user._id}`,
  message: 'Too many posts created',
  handler: (req, res) => {
    logger.warn('Post creation rate limit exceeded', {
      userId: req.user._id,
    });
    res.status(429).json({
      error: 'Too many posts created',
      code: 'POST_CREATION_LIMIT',
      retryAfter: 60 * 60  // 1 hour
    });
  },
});

// ================================================
// UPLOAD LIMITER - 5 uploads/heure max
// ================================================
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  keyGenerator: (req) => `upload:${req.user._id}`,
  message: 'Too many uploads',
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      userId: req.user._id,
    });
    res.status(429).json({
      error: 'Too many uploads',
      code: 'UPLOAD_LIMIT',
      retryAfter: 60 * 60  // 1 hour
    });
  },
});

// ================================================
// COMMENT CREATION LIMITER - 50 comments/heure
// ================================================
exports.commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,
  keyGenerator: (req) => `comment:${req.user._id}`,
  message: 'Too many comments',
  handler: (req, res) => {
    logger.warn('Comment rate limit exceeded', {
      userId: req.user._id,
    });
    res.status(429).json({
      error: 'Too many comments',
      code: 'COMMENT_LIMIT',
      retryAfter: 60 * 60
    });
  },
});

// ================================================
// OTP REQUEST LIMITER - 3 tentatives par 30 minutes
// ================================================
exports.otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,  // 30 minutes
  max: 3,
  keyGenerator: (req) => {
    return `otp:${req.body.email || req.body.phone}:${req.ip}`;
  },
  message: 'Too many OTP requests',
  handler: (req, res) => {
    logger.warn('OTP rate limit exceeded', {
      email: req.body.email,
      ip: req.ip,
    });
    res.status(429).json({
      error: 'Too many OTP requests',
      code: 'OTP_RATE_LIMIT',
      retryAfter: 30 * 60
    });
  },
});
