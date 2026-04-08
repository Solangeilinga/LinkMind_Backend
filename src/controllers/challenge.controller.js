const { Challenge, ChallengeCompletion } = require('../models/challenge.model');
const User = require('../models/user.model');
const { Badge, UserBadge } = require('../models/content.model');

// Fonction utilitaire pour vérifier les badges
async function checkAndAwardBadges(user, challenge = null) {
  const newBadges = [];
  
  try {
    // Compter le nombre total de défis complétés
    const totalCompletions = await ChallengeCompletion.countDocuments({ user: user._id });
    
    // Compter le nombre d'enregistrements d'humeur
    const Mood = require('../models/mood.model');
    const moodCount = await Mood.countDocuments({ user: user._id });
    
    // ✅ Correction : Utiliser Badge déjà importé (pas besoin de require)
    const badges = await Badge.find({ isActive: true }).sort({ order: 1 });
    
    for (const badge of badges) {
      // Vérifier si l'utilisateur a déjà ce badge (via le champ badges du user)
      const hasBadge = user.badges.some(b => b.badgeId === badge.id);
      if (hasBadge) continue;
      
      // Vérifier les critères
      let earned = false;
      switch (badge.condition?.type) {
        case 'challenge_count':
          if (totalCompletions >= (badge.condition?.threshold || 0)) earned = true;
          break;
        case 'points':
          if (user.totalPoints >= (badge.condition?.threshold || 0)) earned = true;
          break;
        case 'streak_days':
          if (user.streakDays >= (badge.condition?.threshold || 0)) earned = true;
          break;
        case 'mood_count':
          if (moodCount >= (badge.condition?.threshold || 0)) earned = true;
          break;
      }
      
      if (earned) {
        // Ajouter le badge au champ badges de l'utilisateur
        user.badges.push({
          badgeId: badge.id,
          earnedAt: new Date()
        });
        
        newBadges.push({
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          description: badge.description
        });
      }
    }
    
    // Sauvegarder l'utilisateur si des badges ont été ajoutés
    if (newBadges.length > 0) {
      await user.save({ validateBeforeSave: false });
    }
    
  } catch (error) {
    console.error('Error checking badges:', error);
  }
  
  return newBadges;
}// GET /api/challenges/daily
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
      const targeted = await Challenge.find({ ...filter, targetMoods: moodLabel })
        .sort({ order: 1 })
        .limit(3);
      const general = await Challenge.find({ ...filter, targetMoods: { $size: 0 } })
        .sort({ order: 1 })
        .limit(2);
      challenges = [...targeted, ...general];
    } else {
      challenges = await Challenge.find(filter)
        .sort({ order: 1 })
        .limit(5);
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

// GET /api/challenges/:id
exports.getChallengeById = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const completion = await ChallengeCompletion.findOne({
      user: req.user._id,
      challenge: challenge._id,
      date: today,
    });
    
    const result = {
      ...challenge.toObject(),
      isCompleted: completion != null,
    };
    
    res.json({ challenge: result });
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
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Challenge.countDocuments(filter);

    // Marquer les défis complétés aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const completions = await ChallengeCompletion.find({
      user: req.user._id,
      date: today,
    }).select('challenge');
    const completedIds = completions.map(c => c.challenge.toString());

    const result = challenges.map(c => ({
      ...c.toObject(),
      isCompleted: completedIds.includes(c._id.toString()),
    }));

    res.json({ challenges: result, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// POST /api/challenges/:id/complete
exports.completeChallenge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { durationSeconds, moodId, reflection, feedback } = req.body;
    const user = req.user;
    const today = new Date().toISOString().split('T')[0];

    const challenge = await Challenge.findById(id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.isPremium && !user.isPremium) {
      return res.status(403).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' });
    }

    // Check if already completed today
    const existing = await ChallengeCompletion.findOne({ 
      user: user._id, 
      challenge: id, 
      date: today 
    });
    if (existing) {
      return res.status(409).json({ error: 'Already completed today', pointsEarned: 0 });
    }

    // Vérifie si le défi de type reflection nécessite une réponse
    if (challenge.completionType.type === 'reflection' && !reflection) {
      return res.status(400).json({ error: 'A reflection is required for this challenge' });
    }

    // Create completion
    const completion = await ChallengeCompletion.create({
      user: user._id,
      challenge: id,
      date: today,
      pointsEarned: challenge.points,
      durationSeconds,
      reflection: reflection || null,
      mood: moodId || null,
      feedback,
    });

    // Award points
    user.totalPoints = (user.totalPoints || 0) + challenge.points;
    user.updateLevel();
    user.updateStreak();
    await user.save({ validateBeforeSave: false });

    // Check for new badges
    const newBadges = await checkAndAwardBadges(user, challenge);

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
    console.error('Error completing challenge:', error);
    next(error);
  }
};

// PATCH /api/challenges/:completionId/feedback
exports.submitFeedback = async (req, res, next) => {
  try {
    const { completionId } = req.params;
    const { helpful, rating, comment } = req.body;

    const completion = await ChallengeCompletion.findOneAndUpdate(
      { _id: completionId, user: req.user._id },
      { feedback: { helpful, rating, comment } },
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

// GET /api/challenges/categories
exports.getChallengeCategories = async (req, res, next) => {
  try {
    const { ChallengeCategory } = require('../models/content.model');
    const categories = await ChallengeCategory.find({ isActive: true })
      .sort({ order: 1 });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

// GET /api/challenges/difficulties
exports.getChallengeDifficulties = async (req, res, next) => {
  try {
    const { ChallengeDifficulty } = require('../models/content.model');
    const difficulties = await ChallengeDifficulty.find({ isActive: true })
      .sort({ order: 1 });
    res.json({ difficulties });
  } catch (error) {
    next(error);
  }
};