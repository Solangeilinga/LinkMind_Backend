const { ChallengeCompletion } = require('../models/challenge.model');
const Mood  = require('../models/mood.model');
const { Badge } = require('../models/content.model');

// ─── Vérifie et attribue les badges mérités ──────────────────────────────────
const checkAndAwardBadges = async (user) => {
  const badges = await Badge.find({ isActive: true });
  const earnedIds = user.badges.map(b => b.badgeId);
  const newBadges = [];

  for (const badge of badges) {
    if (earnedIds.includes(badge.id)) continue;

    let earned = false;
    const { type, threshold } = badge.condition || {};

    try {
      if (type === 'mood_count') {
        const count = await Mood.countDocuments({ user: user._id });
        earned = count >= threshold;
      } else if (type === 'streak_days') {
        earned = user.streakDays >= threshold;
      } else if (type === 'challenge_count') {
        const count = await ChallengeCompletion.countDocuments({ user: user._id });
        earned = count >= threshold;
      } else if (type === 'points') {
        earned = user.totalPoints >= threshold;
      }
    } catch (err) {
      console.error(`Badge check error for ${badge.id}:`, err.message);
    }

    if (earned) {
      user.badges.push({ badgeId: badge.id });
      newBadges.push({ id: badge.id, name: badge.name, icon: badge.icon });
    }
  }

  if (newBadges.length > 0) await user.save({ validateBeforeSave: false });
  return newBadges;
};

// ─── Retourne tous les badges avec statut earned ──────────────────────────────
const getAllBadges = async (user) => {
  const badges = await Badge.find({ isActive: true }).sort({ order: 1 });
  const earnedIds = user ? user.badges.map(b => b.badgeId) : [];
  return badges.map(b => ({
    id:          b.id,
    name:        b.name,
    description: b.description,
    icon:        b.icon,
    earned:      earnedIds.includes(b.id),
    earnedAt:    user?.badges.find(ub => ub.badgeId === b.id)?.earnedAt || null,
  }));
};

module.exports = { checkAndAwardBadges, getAllBadges };