const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errorCount: errors.array().length,
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        // Never return user input back
      }))
    });
  }
  next();
};

// Auth validators
exports.validateRegister = [
  body('email')
    .if(body('phone').isEmpty())
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
    
  body('firstName')
    .trim()
    .if(body('firstName').notEmpty())
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Invalid first name'),
    
  body('phone')
    .optional()
    .trim()
    .matches(/^(\+?\d{6,15})$/)
    .withMessage('Invalid phone format'),
    
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),
    
  handleValidationErrors,
];

exports.validateLogin = [
  body('email')
    .if(body('phone').isEmpty())
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
    
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password required'),
    
  body('phone')
    .optional()
    .trim()
    .matches(/^(\+?\d{6,15})$/)
    .withMessage('Invalid phone format'),
    
  handleValidationErrors,
];

exports.validateMoodEntry = [
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Score must be between 1 and 5'),
    
  body('label')
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Label is required (max 100 chars)'),
    
  body('factors')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Max 10 factors allowed'),
    
  body('energy')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Energy must be 1-5'),
    
  handleValidationErrors,
];

exports.validateChallengeCompletion = [
  body('challengeId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid challenge ID required'),
    
  body('completionType')
    .isIn(['manual', 'automatic'])
    .withMessage('Invalid completion type'),
    
  handleValidationErrors,
];

exports.validatePostCreation = [
  body('content')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 1500 })
    .withMessage('Content required (max 1500 chars)'),
    
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be boolean'),
    
  handleValidationErrors,
];

exports.validateCommentCreation = [
  body('postId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid post ID required'),
    
  body('content')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment required (max 500 chars)'),
    
  handleValidationErrors,
];

exports.validatePaginationQuery = [
  // Optional - for query validation
  (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Invalid pagination',
        code: 'INVALID_PAGINATION',
        details: {
          page: 'Must be >= 1',
          limit: 'Must be 1-100',
        }
      });
    }
    
    req.pagination = { page, limit, skip: (page - 1) * limit };
    next();
  }
];
