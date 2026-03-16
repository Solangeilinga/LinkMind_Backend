const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true, maxlength: 1500 },
  postType: {
    type: String,
    enum: ['mood_share', 'challenge_completed', 'achievement', 'support', 'general', 'feeling', 'question', 'success', 'tip'],
    default: 'general',
  },
  moodRef:      { type: mongoose.Schema.Types.ObjectId, ref: 'Mood',      default: null },
  challengeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', default: null },
  moodScore:    { type: Number, min: 1, max: 5, default: null },
  isAnonymous:  { type: Boolean, default: true },
  likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount:   { type: Number, default: 0 },
  commentsCount:{ type: Number, default: 0 },
  isVisible:    { type: Boolean, default: true },
  reportCount:  { type: Number, default: 0 },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String, reportedAt: Date,
  }],
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  post:          { type: mongoose.Schema.Types.ObjectId, ref: 'Post',    required: true, index: true },
  author:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  content:       { type: String, required: true, maxlength: 1000 },
  isAnonymous:   { type: Boolean, default: true },
  isPrivate:     { type: Boolean, default: false },
  likes:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount:    { type: Number, default: 0 },
  repliesCount:  { type: Number, default: 0 },
  isVisible:     { type: Boolean, default: true },
}, { timestamps: true });

const groupChallengeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  challenge:   { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  targetParticipants: { type: Number, default: 100 },
  participants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantsCount: { type: Number, default: 0 },
  completions:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completionsCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  reward: { points: { type: Number, default: 50 }, badgeId: { type: String, default: null } },
}, { timestamps: true });

const Post           = mongoose.model('Post',           postSchema);
const Comment        = mongoose.model('Comment',        commentSchema);
const GroupChallenge = mongoose.model('GroupChallenge', groupChallengeSchema);

module.exports = { Post, Comment, GroupChallenge };