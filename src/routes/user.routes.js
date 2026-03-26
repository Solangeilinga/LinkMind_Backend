const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const User = require('../models/user.model');
const { getAllBadges } = require('../services/badge.service');
const { generateReport } = require('../services/report.service');
const Mood = require('../models/mood.model');
const { Post } = require('../models/community.model');

router.use(authenticate);

// GET /api/users/me
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const badges = await getAllBadges(user);
    res.json({ user, badges });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/me
router.patch('/me', async (req, res, next) => {
  try {
    const allowed = ['name', 'firstName', 'lastName', 'preferences', 'anonymousAlias', 'phone', 'age', 'city', 'gender'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Check alias uniqueness if changed
    if (updates.anonymousAlias !== undefined) {
      const alias = updates.anonymousAlias?.trim() || null;
      updates.anonymousAlias = alias;
      if (alias) {
        const existing = await User.findOne({ anonymousAlias: alias, _id: { $ne: req.user._id } });
        if (existing) return res.status(409).json({ error: 'Ce pseudo est déjà pris. Choisis-en un autre.' });
      }
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { period = 'alltime' } = req.query;

    const users = await User.find({ isActive: true })
      .select('name avatar level totalPoints streakDays')
      .sort({ totalPoints: -1 })
      .limit(50);

    const myRank = users.findIndex(u => u._id.toString() === req.user._id.toString()) + 1;

    res.json({ leaderboard: users, myRank, total: users.length });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/me/report — Génère le rapport PDF
router.get('/me/report', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Premium uniquement
    if (!user.isPremium) {
      return res.status(403).json({
        error: 'premium_required',
        message: 'Les rapports PDF sont réservés aux membres Premium. 👑',
      });
    }

    // Historique humeur (14 derniers jours)
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const moodHistory = await Mood.find({
      user: req.user._id,
      createdAt: { $gte: since },
    }).sort({ createdAt: 1 }).select('score label createdAt');

    const moodData = moodHistory.map(m => ({
      score: m.score,
      label: m.label,
      date:  m.createdAt,
    }));

    // Défis complétés récents
    const { ChallengeCompletion } = require('../models/challenge.model');
    let challenges = [];
    try {
      challenges = await ChallengeCompletion
        .find({ user: req.user._id })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate('challenge', 'title icon category');
    } catch (_) {}

    // Badges
    const allBadges   = getAllBadges();
    const earnedIds   = user.badges.map(b => b.badgeId);
    const badgesData  = allBadges.map(b => ({ ...b, earned: earnedIds.includes(b.id) }));

    // Génération PDF
    const pdfBuffer = await generateReport(user, moodData, challenges, badgesData);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="linkmind-rapport-${dateStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (err) { next(err); }
});

module.exports = router;