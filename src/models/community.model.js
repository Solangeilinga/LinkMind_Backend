const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content:      { type: String, required: true, maxlength: 1500 },
  postType: {
    type: String,
    enum: ['mood_share', 'challenge_completed', 'achievement', 'support', 'general', 'feeling', 'question', 'success', 'tip'],
    default: 'general',
  },
  moodEmoji:    { type: String, default: null },
  moodRef:      { type: mongoose.Schema.Types.ObjectId, ref: 'Mood', default: null },
  challengeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', default: null },
  moodScore:    { type: Number, min: 1, max: 5, default: null },
  isAnonymous:  { type: Boolean, default: true },

  likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount:   { type: Number, default: 0 },
  sameFeelings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sameFeelingsCount: { type: Number, default: 0 },
  commentsCount:{ type: Number, default: 0 },
  isVisible:    { type: Boolean, default: true },
  
  // Signalements
  reportCount:  { type: Number, default: 0 },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'other'], required: true },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
    reportedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['none', 'warning', 'hidden', 'deleted'], default: 'none' }
  }],
  
  // Modération automatique
  autoModerationFlags: [{
    type: { type: String, enum: ['profanity', 'personal_info', 'url', 'phone', 'email'] },
    detectedAt: { type: Date, default: Date.now }
  }],
  
}, { timestamps: true });

// ✅ Modèle Comment avec signalements
const commentSchema = new mongoose.Schema({
  post:          { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  author:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  content:       { type: String, required: true, maxlength: 1000 },
  isAnonymous:   { type: Boolean, default: true },
  isPrivate:     { type: Boolean, default: false },
  likes:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount:    { type: Number, default: 0 },
  repliesCount:  { type: Number, default: 0 },
  isVisible:     { type: Boolean, default: true },
  
  // Signalements pour commentaires
  reportCount:   { type: Number, default: 0 },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'other'], required: true },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
    reportedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['none', 'warning', 'hidden', 'deleted'], default: 'none' }
  }],
  
  autoModerationFlags: [{
    type: { type: String, enum: ['profanity', 'personal_info', 'url', 'phone', 'email'] },
    detectedAt: { type: Date, default: Date.now }
  }],
  
}, { timestamps: true });

// ✅ Modèle Professional avec signalements
const professionalSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  type: { type: String, enum: ['psychologist', 'coach', 'doctor'], required: true },
  title: { type: String },
  bio: { type: String, maxlength: 1000 },
  specialties: [{ type: String }],
  city: { type: String },
  photo: { type: String },
  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: true },
  isInPerson: { type: Boolean, default: true },
  sessionPrice: { type: Number },
  currency: { type: String, default: 'FCFA' },
  commissionRate: { type: Number, default: 10 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  totalBookings: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  // Signalements pour professionnels
  reportCount: { type: Number, default: 0 },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ['unprofessional', 'no_show', 'inappropriate', 'fraud', 'other'], required: true },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
    reportedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['none', 'warning', 'suspended', 'banned'], default: 'none' }
  }],
  
  // Modération automatique
  autoModerationFlags: [{
    type: { type: String, enum: ['suspicious_activity', 'complaints', 'no_show_pattern'] },
    detectedAt: { type: Date, default: Date.now }
  }],
  
}, { timestamps: true });

const groupChallengeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  challenge:   { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  targetParticipants: { type: Number, default: 100 },
  participants:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantsCount: { type: Number, default: 0 },
  completions:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completionsCount:  { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  reward: { points: { type: Number, default: 50 }, badgeId: { type: String, default: null } },
}, { timestamps: true });

// ✅ Modèle ModerationLog pour suivre les actions de modération
const moderationLogSchema = new mongoose.Schema({
  moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'comment', 'professional'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, enum: ['warning', 'hide', 'delete', 'suspend', 'ban'], required: true },
  reason: { type: String, required: true },
  previousState: { type: mongoose.Schema.Types.Mixed },
  newState: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Professional = mongoose.model('Professional', professionalSchema);
const GroupChallenge = mongoose.model('GroupChallenge', groupChallengeSchema);
const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

module.exports = { Post, Comment, Professional, GroupChallenge, ModerationLog };