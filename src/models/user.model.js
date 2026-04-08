const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
    minlength: 2,
    maxlength: 100,
    default: null,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    default: null,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  anonymousAlias: {
    type: String,
    default: null,
    trim: true,
    maxlength: 30,
    sparse: true,
  },
  firstName:  { type: String, default: null, trim: true, maxlength: 50 },
  lastName:   { type: String, default: null, trim: true, maxlength: 50 },
  phone: {
    type: String,
    default: null,
    trim: true,
    maxlength: 20,
    match: [/^(\+?\d{6,15})$/, 'Format invalide. Ex: +22661645069 ou 61645069'],
    sparse: true,
  },
  age:        { type: Number, default: null, min: 10, max: 120 },
  city:       { type: String, default: null, trim: true, maxlength: 100 },
  gender:     { type: String, enum: ['homme', 'femme', 'autre', 'non_specifie', null], default: null },

  // App stats
  totalPoints: { type: Number, default: 0 },
  level: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  },
  streakDays: { type: Number, default: 0 },
  lastActivityDate: { type: Date, default: null },

  // Badges earned
  badges: [{
    badgeId: String,
    earnedAt: { type: Date, default: Date.now },
  }],

  // Subscription
  isPremium: { type: Boolean, default: false },
  isAdmin:   { type: Boolean, default: false },

  // Mindo daily message limit (freemium)
  mindoMessageCount: { type: Number, default: 0 },
  mindoLastMessageDate: { type: Date, default: null },
  premiumExpiresAt: { type: Date, default: null },

  // Preferences
  preferences: {
    notificationsEnabled: { type: Boolean, default: true },
    reminderTime: { type: String, default: '20:00' },
    anonymousInCommunity: { type: Boolean, default: false },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
  },

  // Auth
  refreshToken: { type: String, select: false },
  otp:          { type: String, select: false, default: null },
  otpExpires:   { type: Date,   select: false, default: null },
  otpChannel:   { type: String, select: false, default: null },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },

  // Acceptation légale
  legalAccepted:    { type: Boolean, default: false },
  legalAcceptedAt:  { type: Date,    default: null },
  legalVersion:     { type: String,  default: null }, // version des CGU acceptées

  // ========== NOUVEAUX CHAMPS DE SÉCURITÉ ==========
  
  // Session timeout
  lastActivity: { type: Date, default: Date.now },
  sessionId: { type: String, default: null },
  maxConcurrentSessions: { type: Number, default: 3 },
  
  // Brute force protection
  loginAttempts: { type: Number, default: 0 },
  lastLoginAttempt: { type: Date, default: null },
  isLocked: { type: Boolean, default: false },
  lockedUntil: { type: Date, default: null },
  accountStatus: { type: String, enum: ['active', 'locked', 'suspended'], default: 'active' },
  
  // Détection de comportements suspects
  activityLog: [{
    type: { type: String, enum: ['login', 'post', 'comment', 'report', 'like'] },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: String,
    userAgent: String
  }],
  
  suspicionScore: { type: Number, default: 0 },
  restricted: { type: Boolean, default: false },
  restrictionReason: String,
  restrictedUntil: Date,
  
  flags: [{
    type: { type: String, enum: ['suspicious_activity', 'spam', 'harassment'] },
    score: Number,
    timestamp: Date,
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Chiffrement des messages (clés pour E2EE)
  publicKey: { type: String, default: null, select: false },
  privateKey: { type: String, default: null, select: false },
  encryptionEnabled: { type: Boolean, default: false },

}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update level based on points
userSchema.methods.updateLevel = function () {
  if (this.totalPoints >= 2000) this.level = 'platinum';
  else if (this.totalPoints >= 800) this.level = 'gold';
  else if (this.totalPoints >= 300) this.level = 'silver';
  else this.level = 'bronze';
};

// Update streak
userSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!this.lastActivityDate) {
    this.streakDays = 1;
  } else {
    const last = new Date(this.lastActivityDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return;
    if (diffDays === 1) this.streakDays += 1;
    else this.streakDays = 1;
  }
  this.lastActivityDate = new Date();
};

// ========== NOUVELLES MÉTHODES DE SÉCURITÉ ==========

// Vérifier si la session est active
userSchema.methods.isSessionActive = function () {
  const timeout = 60 * 60 * 1000; // 60 minutes
  const lastActivity = this.lastActivity || this.createdAt;
  const inactiveTime = Date.now() - new Date(lastActivity).getTime();
  return inactiveTime < timeout;
};

// Vérifier si le compte est verrouillé
userSchema.methods.isAccountLocked = function () {
  if (!this.isLocked) return false;
  if (this.lockedUntil && this.lockedUntil < new Date()) {
    // Le verrouillage a expiré
    this.isLocked = false;
    this.loginAttempts = 0;
    this.lockedUntil = null;
    return false;
  }
  return true;
};

// Enregistrer une activité suspecte
userSchema.methods.addSuspiciousFlag = function (type, score, metadata = {}) {
  this.flags = this.flags || [];
  this.flags.push({
    type: type,
    score: score,
    timestamp: new Date(),
    metadata: metadata
  });
  this.suspicionScore = (this.suspicionScore || 0) + score;
  
  // Si score > 70, restreindre le compte
  if (this.suspicionScore > 70 && !this.restricted) {
    this.restricted = true;
    this.restrictionReason = 'Activité suspecte détectée';
    this.restrictedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  }
};

// Enregistrer une activité
userSchema.methods.recordActivity = function (type, metadata = {}, ip, userAgent) {
  this.activityLog = this.activityLog || [];
  this.activityLog.push({
    type,
    timestamp: new Date(),
    metadata,
    ip,
    userAgent
  });
  
  // Garder seulement les 100 dernières activités
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.otp;
  delete obj.otpExpires;
  delete obj.publicKey;
  delete obj.privateKey;
  delete obj.activityLog;
  return obj;
};


// ✅ Index pour le leaderboard et les performances
userSchema.index({ totalPoints: -1 });
userSchema.index({ streakDays: -1 });
userSchema.index({ isActive: 1, totalPoints: -1 });
userSchema.index({ level: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ anonymousAlias: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);