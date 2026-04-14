const helmet = require('helmet');
const logger = require('../utils/logger');

// ================================================
// SECURITY HEADERS MIDDLEWARE
// ================================================

// Enhanced Helmet configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.linkmind.com', 'https://firebaseio.com'],
      fontSrc: ["'self'", 'fonts.googleapis.com'],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
});

// Custom security headers
const customSecurityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Disable XSS Filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent referrer leaking
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove sensitive headers
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  next();
};

// ================================================
// CORS VALIDATION MIDDLEWARE
// ================================================
const corsValidation = (req, res, next) => {
  const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim());
  const origin = req.headers.origin;

  if (!allowedOrigins.length) {
    logger.error('⚠️ FRONTEND_URL not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  if (!isAllowed && origin) {
    logger.warn('CORS origin blocked', {
      origin,
      ip: req.ip,
    });
  }

  next();
};

// ================================================
// REQUEST SANITIZATION
// ================================================
const sanitizeRequest = (req, res, next) => {
  // Limit request size
  const maxBodySize = 10 * 1024 * 1024; // 10MB
  if (req.headers['content-length'] > maxBodySize) {
    logger.warn('Request too large', {
      size: req.headers['content-length'],
      ip: req.ip,
    });
    return res.status(413).json({
      error: 'Payload too large',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  // Clean potentially malicious characters from strings
  if (req.body && typeof req.body === 'object') {
    const sanitizeValue = (val) => {
      if (typeof val === 'string') {
        // Remove null bytes
        return val.replace(/\0/g, '');
      }
      if (Array.isArray(val)) {
        return val.map(v => sanitizeValue(v));
      }
      if (typeof val === 'object' && val !== null) {
        const cleaned = {};
        for (const key in val) {
          cleaned[key] = sanitizeValue(val[key]);
        }
        return cleaned;
      }
      return val;
    };

    req.body = sanitizeValue(req.body);
  }

  next();
};

// ================================================
// SECURITY CHECKS MIDDLEWARE
// ================================================
const securityChecks = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|onerror|onclick|eval)/i,
    /union.*select/i,
    /drop.*table/i,
  ];

  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  // Check body
  for (const key in req.body) {
    if (checkString(req.body[key])) {
      logger.warn('Suspicious pattern detected in request', {
        field: key,
        ip: req.ip,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'INVALID_DATA',
      });
    }
  }

  next();
};

// ================================================
// REQUEST ID LOGGING
// ================================================
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || 
                    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    logger.info('Response sent', {
      requestId,
      statusCode: res.statusCode,
      responseTime: `${Date.now() - req._startTime || 0}ms`,
    });
    res.send = originalSend;
    return res.send(data);
  };

  req._startTime = Date.now();
  next();
};

module.exports = {
  securityHeaders,
  customSecurityHeaders,
  corsValidation,
  sanitizeRequest,
  securityChecks,
  requestIdMiddleware,
};
