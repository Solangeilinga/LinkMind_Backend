require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path'); // ✅ AJOUTER
const connectDB = require('./config/database');

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
const uploadRoutes = require('./routes/upload.routes'); // ✅ AJOUTER

const errorHandler = require('./middleware/errorHandler');
const { scheduleDailyChallenge } = require('./services/scheduler.service');
const { authenticate } = require('./middleware/auth.middleware');
const { checkSessionTimeout } = require('./middleware/session.middleware');
const { applyRateLimit } = require('./middleware/rate-limit.middleware');
const { requireLegalAccepted } = require('./middleware/legal.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// ─── Security middleware ─────────────────────────────────────────────────────
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── ✅ SERVIR LES FICHIERS STATIQUES (avatars) ───────────────────────────────
// Créer le dossier uploads s'il n'existe pas
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rate limiting global ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ─── Routes PUBLIQUES ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), app: 'LinkMind API' });
});

app.use('/api/auth', authRoutes);

// ─── Routes d'upload (publiques pour l'upload, mais avec auth à l'intérieur) ───
app.use('/api/upload', uploadRoutes);

// ─── Middleware d'authentification ────────────────────────────────────────────
app.use('/api/mood', authenticate);
app.use('/api/challenges', authenticate);
app.use('/api/community', authenticate);
app.use('/api/professionals', authenticate);
app.use('/api/ads', authenticate);
app.use('/api/users', authenticate);
app.use('/api/content', authenticate);
app.use('/api/notifications', authenticate);
app.use('/api/assistant', authenticate);

// ─── Middlewares de sécurité APRÈS authentification ───────────────────────────
app.use(checkSessionTimeout);
app.use(applyRateLimit);
app.use(requireLegalAccepted);

// ─── Routes PROTÉGÉES ──────────────────────────────────────────────────────────
app.use('/api/mood', moodRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assistant', assistantRoutes);

// ─── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`\n🧠 LinkMind API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads/\n`);
  console.log('✅ Routes montées :');
  console.log('   - /api/auth (public)');
  console.log('   - /api/upload (avatar upload)');
  console.log('   - /api/mood');
  console.log('   - /api/challenges');
  console.log('   - /api/community');
  console.log('   - /api/professionals');
  console.log('   - /api/ads');
  console.log('   - /api/users');
  console.log('   - /api/content');
  console.log('   - /api/notifications');
  console.log('   - /api/assistant');
  console.log('   - /uploads (static files)\n');
  console.log('🔒 Sécurité activée :');
  console.log('   - Session timeout (60 min)');
  console.log('   - Rate limiting (100 requêtes/15min)');
  console.log('   - Brute force protection (5 tentatives login)');
  console.log('   - Détection comportements suspects\n');
});

// Start cron scheduler
scheduleDailyChallenge();

module.exports = app;