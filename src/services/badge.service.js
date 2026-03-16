const { ChallengeCompletion } = require('../models/challenge.model');
const Mood = require('../models/mood.model');

const BADGES = [
  {
    id: 'first_mood',
    name: 'Premier pas',
    description: 'Enregistre ton humeur pour la première fois',
    icon: '🌱',
    check: async (user) => {
      const count = await Mood.countDocuments({ user: user._id });
      return count >= 1;
    },
  },
  {
    id: 'streak_7',
    name: 'Régularité 7J',
    description: '7 jours de suite d\'activité',
    icon: '🔥',
    check: async (user) => user.streakDays >= 7,
  },
  {
    id: 'streak_30',
    name: 'Maître de l\'habitude',
    description: '30 jours consécutifs',
    icon: '💎',
    check: async (user) => user.streakDays >= 30,
  },
  {
    id: 'challenges_5',
    name: 'Actif',
    description: 'Complète 5 défis',
    icon: '⚡',
    check: async (user) => {
      const count = await ChallengeCompletion.countDocuments({ user: user._id });
      return count >= 5;
    },
  },
  {
    id: 'challenges_20',
    name: 'Motivé(e)',
    description: 'Complète 20 défis',
    icon: '🏆',
    check: async (user) => {
      const count = await ChallengeCompletion.countDocuments({ user: user._id });
      return count >= 20;
    },
  },
  {
    id: 'mood_7days',
    name: 'Observateur',
    description: 'Enregistre l\'humeur 7 jours d\'affilée',
    icon: '📊',
    check: async (user) => {
      // Check 7 consecutive mood entries
      const moods = await Mood.find({ user: user._id }).sort({ date: -1 }).limit(7);
      if (moods.length < 7) return false;
      // Check consecutive
      for (let i = 0; i < 6; i++) {
        const d1 = new Date(moods[i].date);
        const d2 = new Date(moods[i + 1].date);
        const diff = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
        if (diff !== 1) return false;
      }
      return true;
    },
  },
  {
    id: 'points_500',
    name: 'Niveau Argent',
    description: 'Atteins 500 points d\'énergie mentale',
    icon: '🥈',
    check: async (user) => user.totalPoints >= 500,
  },
  {
    id: 'points_1000',
    name: 'Niveau Or',
    description: 'Atteins 1000 points d\'énergie mentale',
    icon: '🥇',
    check: async (user) => user.totalPoints >= 1000,
  },
  {
    id: 'breathing_master',
    name: 'Maître du souffle',
    description: 'Complète 10 exercices de respiration',
    icon: '🌬️',
    check: async (user) => {
      const count = await ChallengeCompletion.aggregate([
        { $match: { user: user._id } },
        { $lookup: { from: 'challenges', localField: 'challenge', foreignField: '_id', as: 'ch' } },
        { $match: { 'ch.category': 'breathing' } },
        { $count: 'total' },
      ]);
      return (count[0]?.total || 0) >= 10;
    },
  },
];

/**
 * Check all badges for a user and award new ones.
 * Returns array of newly awarded badges.
 */
exports.checkBadges = async (user) => {
  const newBadges = [];
  const earnedIds = user.badges.map(b => b.badgeId);

  for (const badge of BADGES) {
    if (earnedIds.includes(badge.id)) continue;

    try {
      const earned = await badge.check(user);
      if (earned) {
        user.badges.push({ badgeId: badge.id });
        user.totalPoints += 25; // Bonus for each badge
        newBadges.push({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
        });
      }
    } catch (err) {
      console.error(`Badge check error for ${badge.id}:`, err.message);
    }
  }

  if (newBadges.length > 0) {
    await user.save({ validateBeforeSave: false });
  }

  return newBadges;
};

exports.getAllBadges = () => BADGES.map(b => ({ id: b.id, name: b.name, description: b.description, icon: b.icon }));
