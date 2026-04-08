const User = require('../models/user.model');
const { Post, Comment } = require('../models/community.model');
const notifService = require('./notification.service');

// ─── Définition des badges communauté ────────────────────────────────────────
const COMMUNITY_BADGES = [
  {
    id:          'first_post',
    name:        'Première voix',
    icon:        '🌱',
    description: 'Tu as publié ton premier post dans la communauté',
    condition:   { type: 'posts', threshold: 1 },
  },
  {
    id:          'motivateur',
    name:        'Motivateur',
    icon:        '🌟',
    description: 'Tu as publié 5 posts dans la communauté',
    condition:   { type: 'posts', threshold: 5 },
  },
  {
    id:          'voix_active',
    name:        'Voix active',
    icon:        '💬',
    description: 'Tu as commenté 20 fois dans la communauté',
    condition:   { type: 'comments', threshold: 20 },
  },
  {
    id:          'soutien_actif',
    name:        'Soutien actif',
    icon:        '🤝',
    description: '10 personnes ont cliqué "Moi aussi" sur tes posts',
    condition:   { type: 'same_feelings_received', threshold: 10 },
  },
  {
    id:          'bienveillant',
    name:        'Bienveillant',
    icon:        '❤️',
    description: 'Tu as donné 50 réactions dans la communauté',
    condition:   { type: 'reactions_given', threshold: 50 },
  },
  {
    id:          'toujours_present',
    name:        'Toujours présent',
    icon:        '🏅',
    description: 'Tu as participé à la communauté 10 jours différents',
    condition:   { type: 'active_days', threshold: 10 },
  },
];

// ─── Vérifier et attribuer les badges communauté ─────────────────────────────
const checkCommunityBadges = async (userId, triggerAction) => {
  const user = await User.findById(userId).select('badges communityStats');
  if (!user) return [];

  const earnedIds = (user.badges || []).map(b => b.badgeId);
  const newBadges = [];

  // Recalculer les stats selon l'action déclenchante (optimisation : pas tout recalculer)
  const stats = await getCommunityStats(userId, triggerAction);

  for (const badge of COMMUNITY_BADGES) {
    if (earnedIds.includes(badge.id)) continue;

    let earned = false;
    const { type, threshold } = badge.condition;

    switch (type) {
      case 'posts':
        earned = (stats.postsCount || 0) >= threshold; break;
      case 'comments':
        earned = (stats.commentsCount || 0) >= threshold; break;
      case 'same_feelings_received':
        earned = (stats.sameFeelings || 0) >= threshold; break;
      case 'reactions_given':
        earned = (stats.reactionsGiven || 0) >= threshold; break;
      case 'active_days':
        earned = (stats.activeDays || 0) >= threshold; break;
    }

    if (earned) {
      user.badges = user.badges || [];
      user.badges.push({ badgeId: badge.id, earnedAt: new Date() });
      newBadges.push(badge);
    }
  }

  if (newBadges.length > 0) {
    await user.save({ validateBeforeSave: false });
    // Créer une notification pour chaque badge gagné
    for (const badge of newBadges) {
      await notifService.notifyBadge({
        userId,
        badgeId:   badge.id,
        badgeName: badge.name,
        badgeIcon: badge.icon,
      }).catch(() => {});
    }
  }

  return newBadges;
};

// ─── Calcul des stats communauté ─────────────────────────────────────────────
const getCommunityStats = async (userId, triggerAction) => {
  const stats = {};

  // Posts publiés
  if (['post', 'posts'].includes(triggerAction)) {
    stats.postsCount = await Post.countDocuments({ author: userId, isVisible: true });
  }

  // Commentaires
  if (triggerAction === 'comment') {
    stats.commentsCount = await Comment.countDocuments({ author: userId, isVisible: true });
  }

  // "Moi aussi" reçus sur mes posts
  if (triggerAction === 'same_feeling') {
    const myPosts = await Post.find({ author: userId, isVisible: true }).select('sameFeelingsCount');
    stats.sameFeelings = myPosts.reduce((sum, p) => sum + (p.sameFeelingsCount || 0), 0);
  }

  // Réactions données
  if (triggerAction === 'reaction') {
    const posts = await Post.find({ 'reactions.user': userId }).select('reactions');
    stats.reactionsGiven = posts.reduce((sum, p) =>
      sum + p.reactions.filter(r => r.user.toString() === userId.toString()).length, 0);
  }

  return stats;
};

// ─── Récupérer tous les badges communauté avec statut ─────────────────────────
const getAllCommunityBadges = (user) => {
  const earnedIds = (user?.badges || []).map(b => b.badgeId);
  return COMMUNITY_BADGES.map(b => ({
    ...b,
    earned:   earnedIds.includes(b.id),
    earnedAt: user?.badges?.find(ub => ub.badgeId === b.id)?.earnedAt || null,
  }));
};

module.exports = { checkCommunityBadges, getAllCommunityBadges, COMMUNITY_BADGES };