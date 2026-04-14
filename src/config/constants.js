// ================================================
// APPLICATION CONSTANTS
// ================================================

const CONSTANTS = {
  // User Levels
  USER_LEVELS: {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
  },

  // Account Status
  ACCOUNT_STATUS: {
    ACTIVE: 'active',
    LOCKED: 'locked',
    SUSPENDED: 'suspended',
    DEACTIVATED: 'deactivated',
  },

  // Challenge
  CHALLENGE_DIFFICULTY: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    EXTREME: 'extreme',
  },

  CHALLENGE_COMPLETION_TYPE: {
    MANUAL: 'manual',
    AUTOMATIC: 'automatic',
  },

  // Mood
  MOOD_LEVELS: {
    TERRIBLE: 1,
    BAD: 2,
    OKAY: 3,
    GOOD: 4,
    EXCELLENT: 5,
  },

  MOOD_LABELS: {
    1: 'Terrible',
    2: 'Bad',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent',
  },

  // Community
  POST_STATUS: {
    ACTIVE: 'active',
    REPORTED: 'reported',
    REMOVED: 'removed',
    ARCHIVED: 'archived',
  },

  REPORT_TYPES: {
    HARASSMENT: 'harassment',
    SPAM: 'spam',
    INAPPROPRIATE: 'inappropriate',
    SELF_HARM: 'self_harm',
    HATE_SPEECH: 'hate_speech',
    MISINFORMATION: 'misinformation',
  },

  REPORT_STATUS: {
    PENDING: 'pending',
    INVESTIGATING: 'investigating',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
  },

  // Activity Types
  ACTIVITY_TYPES: {
    LOGIN: 'login',
    REGISTER: 'register',
    MOOD_LOG: 'mood_log',
    CHALLENGE_COMPLETE: 'challenge_complete',
    POST_CREATE: 'post_create',
    POST_DELETE: 'post_delete',
    COMMENT: 'comment',
    REACT: 'react',
    REPORT: 'report',
    PURCHASE: 'purchase',
  },

  // Badge Types
  BADGE_TYPES: {
    MOOD_STREAK: 'mood_streak',
    MOOD_MILESTONE: 'mood_milestone',
    CHALLENGE_MASTER: 'challenge_master',
    COMMUNITY_HERO: 'community_hero',
    POINTS_MILESTONE: 'points_milestone',
    LEVEL_UP: 'level_up',
    PREMIUM_MEMBER: 'premium_member',
  },

  // Response Codes
  RESPONSE_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    RATE_LIMIT: 429,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Error Codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    INVALID_DATA: 'INVALID_DATA',
    RATE_LIMIT: 'RATE_LIMIT',
    SERVER_ERROR: 'SERVER_ERROR',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  },

  // Limits
  LIMITS: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    NAME_MAX_LENGTH: 100,
    EMAIL_MAX_LENGTH: 255,
    PHONE_MAX_LENGTH: 20,
    POST_MAX_LENGTH: 1500,
    COMMENT_MAX_LENGTH: 500,
    BIO_MAX_LENGTH: 500,
    CITY_MAX_LENGTH: 100,
    FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
    AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  },

  // Session
  SESSION: {
    TIMEOUT_MS: 60 * 60 * 1000, // 1 hour
    MAX_CONCURRENT_SESSIONS: 3,
  },

  // Rate Limits
  RATE_LIMITS: {
    AUTH: { windowMs: 15 * 60 * 1000, max: 5 },
    PASSWORD_RESET: { windowMs: 60 * 60 * 1000, max: 3 },
    API: { windowMs: 15 * 60 * 1000, max: 100 },
    MINDO: { windowMs: 60 * 60 * 1000, max: 10 },
    POST_CREATE: { windowMs: 60 * 60 * 1000, max: 20 },
    COMMENT_CREATE: { windowMs: 60 * 60 * 1000, max: 50 },
    UPLOAD: { windowMs: 60 * 60 * 1000, max: 5 },
    OTP: { windowMs: 30 * 60 * 1000, max: 3 },
  },

  // Points & Rewards
  POINTS: {
    MOOD_LOG: 10,
    CHALLENGE_COMPLETE: 50,
    CHALLENGE_STREAK: 100,
    POST_LIKE: 5,
    COMMENT: 3,
    HELP_OTHERS: 25,
  },

  // Badge Thresholds
  BADGE_THRESHOLDS: {
    MOOD_STREAK_7: 7,
    MOOD_STREAK_30: 30,
    MOOD_STREAK_100: 100,
    MOOD_MILESTONE_10: 10,
    POINTS_100: 100,
    POINTS_500: 500,
    POINTS_1000: 1000,
  },

  // Premium Features
  PREMIUM: {
    MINDO_DAILY_LIMIT: 'unlimited',
    FREE_DAILY_LIMIT: 10,
    MONTHLY_PRICE: 4.99,
    ANNUAL_PRICE: 49.99,
  },

  // Email Templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    VERIFY_EMAIL: 'verify_email',
    RESET_PASSWORD: 'reset_password',
    OTP: 'otp',
    ALERT: 'alert',
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    ACHIEVEMENT: 'achievement',
    CHALLENGE: 'challenge',
    REMINDER: 'reminder',
    MESSAGE: 'message',
    ALERT: 'alert',
    PROMOTION: 'promotion',
  },

  // Default Values
  DEFAULTS: {
    PAGE: 1,
    LIMIT: 20,
    SORT_BY: '-createdAt',
    TIMEZONE: 'UTC',
  },

  // Regex Patterns
  PATTERNS: {
    EMAIL: /^\S+@\S+\.\S+$/,
    PHONE: /^(\+?\d{6,15})$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
    URL: /^https?:\/\/.+$/,
  },

  // Strings
  MESSAGES: {
    SUCCESS: 'Operation successful',
    ERROR: 'Something went wrong',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    RATE_LIMITED: 'Too many requests',
    VALIDATION_FAILED: 'Validation failed',
  }
};

module.exports = CONSTANTS;
