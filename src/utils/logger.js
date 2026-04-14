const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Sensitive fields that should be redacted
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'code', 'otp',
  'refreshToken', 'accessToken', 'apiKey', 'apiSecret',
  'creditCard', 'ssn', 'pin', 'jwt', 'pass', 'bearer'
];

// Function to sanitize sensitive data
const sanitizeData = (obj, depth = 0) => {
  if (depth > 5) return obj; // Prevent infinite recursion
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item, depth + 1));
  }

  const cleaned = {};
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    // Check if key is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleaned[key] = sanitizeData(obj[key], depth + 1);
    } else {
      cleaned[key] = obj[key];
    }
  }
  
  return cleaned;
};

// Custom format for logs
const customFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const cleanedMeta = Object.keys(meta).length ? sanitizeData(meta) : {};
  const metaStr = Object.keys(cleanedMeta).length ? JSON.stringify(cleanedMeta) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'linkmind-api' },
  transports: [
    // Error logs - only errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        customFormat
      ),
    }),
    // Combined logs - all levels
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        customFormat
      ),
    }),
  ],
});

// Console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      customFormat
    ),
  }));
}

module.exports = logger;
