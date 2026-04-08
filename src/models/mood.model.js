const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Core mood score 1-5
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  // Mood label
  label: {
    type: String,
    enum: ['great', 'good', 'neutral', 'tired', 'stressed', 'anxious', 'sad'],
    required: true,
  },
  // Optional note (max 280 chars)
  note: {
    type: String,
    maxlength: 280,
    default: null,
  },
  // Contributing factors (multi-select)
  factors: [{
    type: String,
    enum: [
      'exams', 'coursework', 'sleep', 'social', 'family',
      'finances', 'health', 'relationship', 'work', 'weather', 'other'
    ],
  }],
  // Physical state
  energyLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  // Context
  recordedAt: {
    type: Date,
    default: Date.now,
  },
  // Date without time for daily dedup check
  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },
}, { timestamps: true });

// One mood entry per user per day
moodSchema.index({ user: 1, date: 1 }, { unique: true });

// Get weekly stats for a user
moodSchema.statics.getWeeklyStats = async function (userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        recordedAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: '$date',
        avgScore: { $avg: '$score' },
        label: { $last: '$label' },
        score: { $last: '$score' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Get mood trends over 30 days
moodSchema.statics.getMonthlyTrend = async function (userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        recordedAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $week: '$recordedAt' },
        avgScore: { $avg: '$score' },
        count: { $sum: 1 },
        dominantFactors: { $push: '$factors' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ✅ Index supplémentaires
moodSchema.index({ user: 1, recordedAt: -1 });
moodSchema.index({ label: 1 });
moodSchema.index({ score: 1 });

module.exports = mongoose.model('Mood', moodSchema);
