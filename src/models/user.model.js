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
    sparse: true, // allows multiple nulls with unique index
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
  // Personal info
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
  // Academic context

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
  premiumExpiresAt: { type: Date, default: null },

  // Preferences
  preferences: {
    notificationsEnabled: { type: Boolean, default: true },
    reminderTime: { type: String, default: '20:00' }, // HH:mm
    anonymousInCommunity: { type: Boolean, default: false },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
  },

  // Auth
  refreshToken: { type: String, select: false },
  // OTP pour récupération de compte
  otp:          { type: String, select: false, default: null },
  otpExpires:   { type: Date,   select: false, default: null },
  otpChannel:   { type: String, select: false, default: null }, // 'email' | 'sms'
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },

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
    
    if (diffDays === 0) return; // same day
    if (diffDays === 1) this.streakDays += 1;
    else this.streakDays = 1; // streak broken
  }
  this.lastActivityDate = new Date();
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);