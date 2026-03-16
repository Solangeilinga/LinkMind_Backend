const { Challenge, ChallengeCompletion } = require('../models/challenge.model');
const User = require('../models/user.model');
const { checkBadges } = require('../services/badge.service');

// GET /api/challenges/daily
exports.getDailyChallenges = async (req, res, next) => {
  try {
    const { moodLabel, moodScore } = req.query;
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];

    // Build filter
    const filter = {
      isActive: true,
      $or: [
        { requiredLevel: 'all' },
        { requiredLevel: user.level },
      ],
    };

    // Filter by premium
    if (!user.isPremium) filter.isPremium = false;

    // Mood-targeted challenges prioritized
    let challenges;
    if (moodLabel) {
      // Get mood-specific + general challenges
      const targeted = await Challenge.find({ ...filter, targetMoods: moodLabel }).limit(3);
      const general = await Challenge.find({ ...filter, targetMoods: { $size: 0 } }).limit(2);
      challenges = [...targeted, ...general];
    } else {
      challenges = await Challenge.find(filter).limit(5);
    }

    // Get today's completions to mark completed challenges
    const completions = await ChallengeCompletion.find({
      user: user._id,
      date: today,
    }).select('challenge');

    const completedIds = completions.map(c => c.challenge.toString());

    const result = challenges.map(c => ({
      ...c.toObject(),
      isCompleted: completedIds.includes(c._id.toString()),
    }));

    res.json({ challenges: result, date: today });
  } catch (error) {
    next(error);
  }
};

// GET /api/challenges — all challenges
exports.getAllChallenges = async (req, res, next) => {
  try {
    const { category, difficulty, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (!req.user.isPremium) filter.isPremium = false;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const challenges = await Challenge.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Challenge.countDocuments(filter);

    res.json({ challenges, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// POST /api/challenges/:id/complete
exports.completeChallenge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { durationSeconds, moodId, feedback } = req.body;
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];

    const challenge = await Challenge.findById(id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.isPremium && !user.isPremium) {
      return res.status(403).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' });
    }

    // Check if already completed today
    const existing = await ChallengeCompletion.findOne({ user: user._id, challenge: id, date: today });
    if (existing) {
      return res.status(409).json({ error: 'Already completed today', pointsEarned: 0 });
    }

    // Create completion
    const completion = await ChallengeCompletion.create({
      user: user._id,
      challenge: id,
      date: today,
      pointsEarned: challenge.points,
      durationSeconds,
      mood: moodId || null,
      feedback,
    });

    // Award points
    user.totalPoints += challenge.points;
    user.updateLevel();
    user.updateStreak();
    await user.save({ validateBeforeSave: false });

    // Check for new badges
    const newBadges = await checkBadges(user);

    res.json({
      message: 'Challenge completed!',
      pointsEarned: challenge.points,
      totalPoints: user.totalPoints,
      level: user.level,
      streakDays: user.streakDays,
      newBadges,
      completion,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/challenges/:completionId/feedback
exports.submitFeedback = async (req, res, next) => {
  try {
    const { completionId } = req.params;
    const { helpful, rating } = req.body;

    const completion = await ChallengeCompletion.findOneAndUpdate(
      { _id: completionId, user: req.user._id },
      { feedback: { helpful, rating } },
      { new: true }
    );

    if (!completion) return res.status(404).json({ error: 'Completion not found' });
    res.json({ message: 'Feedback saved', completion });
  } catch (error) {
    next(error);
  }
};

// GET /api/challenges/history
exports.getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const completions = await ChallengeCompletion.find({ user: req.user._id })
      .populate('challenge', 'title category icon points')
      .sort({ completedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ChallengeCompletion.countDocuments({ user: req.user._id });

    // Total points from challenges
    const totalPointsFromChallenges = await ChallengeCompletion.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
    ]);

    res.json({
      completions,
      total,
      totalPointsEarned: totalPointsFromChallenges[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};
