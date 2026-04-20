require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

// Database & Config
const connectDB = require('./config/database');

// Routes
const authRoutes = require('./routes/auth.routes');
const moodRoutes = require('./routes/mood.routes');
const challengeRoutes = require('./routes/challenge.routes');
const communityRoutes = require('./routes/community.routes');
const userRoutes = require('./routes/user.routes');
const contentRoutes = require('./routes/content.routes');
const notificationRoutes = require('./routes/notification.routes');
const assistantRoutes = require('./routes/assistant.routes');
const professionalRoutes = require('./routes/professional.routes');
const adRoutes = require('./routes/ad.routes');
const uploadRoutes = require('./routes/upload.routes');

// Middleware
const { errorHandler, AppError } = require('./utils/errors');
const { authenticate } = require('./middleware/auth.middleware');
const { checkSessionTimeout } = require('./middleware/session.middleware');
const { requireLegalAccepted } = require('./middleware/legal.middleware');
const {
  securityHeaders,
  customSecurityHeaders,
  corsValidation,
  sanitizeRequest,
  securityChecks,
  requestIdMiddleware,
} = require('./middleware/security.middleware');
const {
  authLimiter,
  apiLimiter,
} = require('./middleware/advanced-rate-limit');

// Logger
const logger = require('./utils/logger');

// Services
const { scheduleDailyChallenge } = require('./services/scheduler.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Verify critical configuration
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_in_production') {
  logger.error('🔴 CRITICAL: JWT_SECRET not properly configured');
  throw new Error('JWT_SECRET must be set to a secure value');
}

if (!process.env.FRONTEND_URL) {
  logger.error('🔴 CRITICAL: FRONTEND_URL not configured');
  throw new Error('FRONTEND_URL must be configured');
}

// Connect to database
connectDB();

// ─────── SECURITY MIDDLEWARE STACK ──────────────────────────────────────────
// 1. Security Headers
app.use(securityHeaders);
app.use(customSecurityHeaders);

// 2. Request Logging & ID
app.use(requestIdMiddleware);

// 3. CORS Configuration Rigoreuse
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim());
    
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin, time: new Date().toISOString() });
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
};

app.use(cors(corsOptions));

// 4. Body Parsing with Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Request Sanitization
app.use(sanitizeRequest);
app.use(securityChecks);

// 6. HTTP Method Override (for compatibility)
app.use((req, res, next) => {
  if (req.method === 'POST' && req.body._method) {
    req.method = req.body._method.toUpperCase();
    delete req.body._method;
  }
  next();
});

// 7. Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─────── STATIC FILES ──────────────────────────────────────────────────────────
// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  etag: true,
  maxAge: 86400000, // 1 day
}));

// ─────── HEALTH CHECK ENDPOINT ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'LinkMind API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// ─────── PUBLIC ROUTES (avec rate limiting) ─────────────────────────────────────
// ✅ Correction : une seule déclaration pour toutes les routes d'auth
app.use('/api/auth', authLimiter, authRoutes);

// Upload routes (with auth middleware inside)
app.use('/api/upload', uploadRoutes);

// ─────── RATE LIMITING FOR API ──────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─────── AUTHENTICATION & SESSION MIDDLEWARE ────────────────────────────────────
// All routes below this require authentication
app.use('/api/mood', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/challenges', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/community', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/professionals', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/ads', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/users', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/content', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/notifications', authenticate, checkSessionTimeout, requireLegalAccepted);
app.use('/api/assistant', authenticate, checkSessionTimeout, requireLegalAccepted);

// ─────── PROTECTED ROUTES ──────────────────────────────────────────────────────
app.use('/api/mood', moodRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assistant', assistantRoutes);

// ─────── 404 NOT FOUND HANDLER ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ─────── GLOBAL ERROR HANDLER (MUST BE LAST) ────────────────────────────────────
app.use(errorHandler);

// ─────── SERVER STARTUP ────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info('🧠 LinkMind API started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧠 LinkMind API running on port ${PORT}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📂 Uploads: http://localhost:${PORT}/uploads/`);
  console.log(`${'='.repeat(60)}`);
  console.log('✅ Security Features Activated:');
  console.log('   ✓ Helmet.js (Security Headers)');
  console.log('   ✓ CORS (Strict Whitelist)');
  console.log('   ✓ Rate Limiting (Auth + API)');
  console.log('   ✓ Input Sanitization');
  console.log('   ✓ Request Logging');
  console.log('   ✓ Error Handler');
  console.log(`${'='.repeat(60)}\n`);

  // Schedule daily challenges
  try {
    scheduleDailyChallenge();
    logger.info('Daily challenge scheduler started');
  } catch (error) {
    logger.error('Failed to start daily challenge scheduler', { error: error.message });
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server shut down');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server shut down');
    process.exit(0);
  });
});

module.exports = app;