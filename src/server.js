require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

const authRoutes = require('./routes/auth.routes');
const moodRoutes = require('./routes/mood.routes');
const challengeRoutes = require('./routes/challenge.routes');
const communityRoutes    = require('./routes/community.routes');
const userRoutes = require('./routes/user.routes');
const contentRoutes = require('./routes/content.routes');
const notificationRoutes = require('./routes/notification.routes');
const assistantRoutes     = require('./routes/assistant.routes');
const professionalRoutes  = require('./routes/professional.routes');
const adRoutes            = require('./routes/ad.routes');

const errorHandler = require('./middleware/errorHandler');
const { scheduleDailyChallenge } = require('./services/scheduler.service');
const { authenticate } = require('./middleware/auth.middleware');
const { checkSessionTimeout } = require('./middleware/session.middleware');
const { applyRateLimit } = require('./middleware/rate-limit.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth routes get stricter limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// API rate limit pour les actions sensibles
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many requests, slow down.' },
});
app.use('/api/community/posts', apiLimiter);
app.use('/api/community/comments', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), app: 'LinkMind API' });
});

// ===== API ROUTES =====
// Routes publiques (sans authentification)
app.use('/api/auth', authRoutes);

// Routes protégées (avec authentification)
app.use('/api/mood', authenticate);
app.use('/api/challenges', authenticate);
app.use('/api/community', authenticate);
app.use('/api/professionals', authenticate);
app.use('/api/ads', authenticate);
app.use('/api/users', authenticate);
app.use('/api/content', authenticate);
app.use('/api/notifications', authenticate);
app.use('/api/assistant', authenticate);

// Appliquer les middlewares de sécurité après authentification
app.use(checkSessionTimeout);
app.use(applyRateLimit);

// Monter les routes protégées
app.use('/api/mood', moodRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assistant', assistantRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`\n🧠 LinkMind API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health\n`);
  console.log('✅ Routes montées :');
  console.log('   - /api/auth (public)');
  console.log('   - /api/mood');
  console.log('   - /api/challenges');
  console.log('   - /api/community');
  console.log('   - /api/professionals');
  console.log('   - /api/ads');
  console.log('   - /api/users');
  console.log('   - /api/content');
  console.log('   - /api/notifications');
  console.log('   - /api/assistant\n');
  console.log('🔒 Sécurité activée :');
  console.log('   - Session timeout (60 min)');
  console.log('   - Rate limiting (100 requêtes/15min)');
  console.log('   - Brute force protection');
  console.log('   - Détection comportements suspects\n');
});

// Start cron scheduler
scheduleDailyChallenge();

module.exports = app;