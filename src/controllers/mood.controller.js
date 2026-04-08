const Mood = require('../models/mood.model');
const User = require('../models/user.model');
const { getPersonalizedRecommendations } = require('../services/recommendation.service');
const { checkAndAwardBadges } = require('../services/badge.service'); // ✅ Ajout

// POST /api/mood
exports.logMood = async (req, res, next) => {
  try {
    const { score, label, note, factors, energyLevel } = req.body;
    const userId = req.user._id;

    if (!score || !label) {
      return res.status(400).json({ error: 'Score and label are required' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Upsert: update if already logged today
    const mood = await Mood.findOneAndUpdate(
      { user: userId, date: today },
      { score, label, note, factors, energyLevel, recordedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let newBadges = [];

    // Award points only on first log of the day
    const isNew = mood.createdAt.toISOString() === mood.updatedAt.toISOString();
    if (isNew) {
      req.user.totalPoints += 10;
      req.user.updateStreak();
      req.user.updateLevel();
      await req.user.save({ validateBeforeSave: false });
      
      // ✅ Vérifier les badges après l'enregistrement d'humeur
      // Recharger l'utilisateur pour avoir les données à jour
      const updatedUser = await User.findById(userId);
      newBadges = await checkAndAwardBadges(updatedUser);
    }

    // Get personalized recommendations based on mood
    const recommendations = await getPersonalizedRecommendations(userId, score, label, req.user.totalPoints);

    res.status(201).json({
      mood,
      pointsEarned: isNew ? 10 : 0,
      totalPoints: req.user.totalPoints,
      streakDays: req.user.streakDays,
      recommendations,
      newBadges, // ✅ Ajout des badges débloqués
    });
  } catch (error) {
    console.error('Error logging mood:', error);
    next(error);
  }
};

// GET /api/mood/today
exports.getTodayMood = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const mood = await Mood.findOne({ user: req.user._id, date: today });
    res.json({ mood });
  } catch (error) {
    next(error);
  }
};

// GET /api/mood/history?days=7
exports.getMoodHistory = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);

    const moods = await Mood.find({
      user: req.user._id,
      recordedAt: { $gte: from },
    }).sort({ date: 1 });

    // Fill missing days with null
    const moodMap = {};
    moods.forEach(m => { moodMap[m.date] = m; });

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      result.push(moodMap[dateStr] || { date: dateStr, score: null, label: null });
    }

    // Compute stats
    const validMoods = moods.filter(m => m.score);
    const avgScore = validMoods.length
      ? (validMoods.reduce((s, m) => s + m.score, 0) / validMoods.length).toFixed(1)
      : null;

    // Trend: compare last 3 days vs previous 3
    const recent = validMoods.slice(-3);
    const previous = validMoods.slice(-6, -3);
    let trend = 'stable';
    if (recent.length >= 2 && previous.length >= 2) {
      const recentAvg = recent.reduce((s, m) => s + m.score, 0) / recent.length;
      const prevAvg = previous.reduce((s, m) => s + m.score, 0) / previous.length;
      if (recentAvg > prevAvg + 0.4) trend = 'improving';
      else if (recentAvg < prevAvg - 0.4) trend = 'declining';
    }

    res.json({
      history: result,
      stats: {
        avgScore,
        trend,
        totalLogged: validMoods.length,
        daysTracked: days,
        completionRate: `${Math.round((validMoods.length / days) * 100)}%`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/mood/insights
exports.getMoodInsights = async (req, res, next) => {
  try {
    const monthly = await Mood.getMonthlyTrend(req.user._id);

    // Most common factors
    const allFactors = await Mood.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: '$factors' },
      { $group: { _id: '$factors', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Best days of the week
    const dayStats = await Mood.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: { $dayOfWeek: '$recordedAt' },
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      monthlyTrend: monthly,
      topFactors: allFactors,
      dayOfWeekStats: dayStats,
    });
  } catch (error) {
    next(error);
  }
};