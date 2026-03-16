const mongoose = require('mongoose');

// Master challenge definition
const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: [String], // Step-by-step
  category: {
    type: String,
    enum: ['breathing', 'meditation', 'journaling', 'gratitude', 'movement', 'social', 'creativity', 'game'],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy',
  },
  durationMinutes: { type: Number, required: true },
  points: { type: Number, required: true },
  icon: { type: String, required: true },
  // Mood context - which moods this challenge targets
  targetMoods: [{
    type: String,
    enum: ['great', 'good', 'neutral', 'tired', 'stressed', 'anxious', 'sad'],
  }],
  // Minimum score required to see this challenge
  requiredLevel: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'all'],
    default: 'all',
  },
  isPremium: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  // For mini-games: config object
  gameConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, { timestamps: true });

// User challenge completion log
const challengeCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  completedAt: { type: Date, default: Date.now },
  date: { type: String, required: true }, // YYYY-MM-DD
  pointsEarned: { type: Number, required: true },
  durationSeconds: { type: Number, default: null }, // actual time spent
  mood: { type: mongoose.Schema.Types.ObjectId, ref: 'Mood', default: null }, // mood at time of completion
  feedback: {
    helpful: { type: Boolean, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
  },
}, { timestamps: true });

// Unique: one completion per challenge per user per day
challengeCompletionSchema.index({ user: 1, challenge: 1, date: 1 }, { unique: true });

const Challenge = mongoose.model('Challenge', challengeSchema);
const ChallengeCompletion = mongoose.model('ChallengeCompletion', challengeCompletionSchema);

module.exports = { Challenge, ChallengeCompletion };
