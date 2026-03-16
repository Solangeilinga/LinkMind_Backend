const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const User = require('../models/user.model');
const { getAllBadges } = require('../services/badge.service');

router.use(authenticate);

// GET /api/users/me
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const allBadges = getAllBadges();
    const earnedBadgeIds = user.badges.map(b => b.badgeId);

    res.json({
      user,
      badges: allBadges.map(b => ({
        ...b,
        earned: earnedBadgeIds.includes(b.id),
        earnedAt: user.badges.find(ub => ub.badgeId === b.id)?.earnedAt || null,
      })),
    });
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

module.exports = router;