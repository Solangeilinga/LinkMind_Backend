const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const User = require('../models/user.model');
const { getAllBadges } = require('../services/badge.service');
const { generateReport } = require('../services/report.service');
const Mood = require('../models/mood.model');
const { Post, Comment } = require('../models/community.model');

router.use(authenticate);

// ─── Acceptation des CGU ──────────────────────────────────────────────────────
router.post('/accept-legal', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('legalAccepted legalAcceptedAt');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Idempotent : si déjà accepté, renvoyer succès sans écraser la date initiale
    if (user.legalAccepted === true) {
      return res.json({ ok: true, acceptedAt: user.legalAcceptedAt, alreadyAccepted: true });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        legalAccepted: true,
        legalAcceptedAt: new Date(),
        legalVersion: '2025-01',
      }
    });
    res.json({ ok: true, acceptedAt: new Date() });
  } catch (err) { 
    console.error('❌ [ACCEPT_LEGAL] Erreur:', err);
    next(err); 
  }
});

// ─── Profil utilisateur ────────────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken -otp -otpExpires -fcmToken -activityLog')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const badges = await getAllBadges(user);
    res.json({ user, badges });
  } catch (err) { 
    console.error('❌ [GET_ME] Erreur:', err);
    next(err); 
  }
});

// ─── Mise à jour profil ────────────────────────────────────────────────────────
router.patch('/me', async (req, res, next) => {
  try {
    const allowed = ['name', 'firstName', 'lastName', 'preferences', 'anonymousAlias', 'phone', 'age', 'city', 'gender', 'email'];
    const updates = {};
    
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Validation et unicité email
    if (updates.email !== undefined && updates.email !== null && updates.email !== '') {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({ error: 'Format email invalide' });
      }
      updates.email = updates.email.toLowerCase().trim();
      const existing = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé par un autre compte.' });
      }
    } else if (updates.email === '' || updates.email === null) {
      updates.email = null; // Permettre de supprimer l'email
    }
    
    // Validation age
    if (updates.age !== undefined && (updates.age < 15 || updates.age > 120)) {
      return res.status(400).json({ error: 'Âge invalide (15-120)' });
    }
    
    // Validation téléphone
    if (updates.phone !== undefined && updates.phone !== null) {
      const phoneRegex = /^(\+?\d{6,15})$/;
      if (!phoneRegex.test(updates.phone)) {
        return res.status(400).json({ error: 'Format téléphone invalide' });
      }
    }
    
    // Vérification unicité alias
    if (updates.anonymousAlias !== undefined) {
      const alias = updates.anonymousAlias?.trim() || null;
      updates.anonymousAlias = alias;
      
      if (alias) {
        const existing = await User.findOne({ 
          anonymousAlias: alias, 
          _id: { $ne: req.user._id } 
        });
        if (existing) {
          return res.status(409).json({ error: 'Ce pseudo est déjà pris. Choisis-en un autre.' });
        }
      }
    }
    
    const user = await User.findByIdAndUpdate(req.user._id, updates, { 
      new: true, 
      runValidators: true 
    }).select('-password -refreshToken -otp -otpExpires');
    
    res.json({ user });
  } catch (err) { 
    console.error('❌ [UPDATE_ME] Erreur:', err);
    next(err); 
  }
});

// ─── Suppression compte (RGPD) ─────────────────────────────────────────────────
router.delete('/me', async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    console.log(`🗑️ [RGPD] Suppression compte demandée: ${userId}`);
    
    // Anonymiser les posts
    await Post.updateMany(
      { author: userId }, 
      { content: '[Contenu supprimé]', isAnonymous: true, author: null }
    );
    
    // Anonymiser les commentaires
    await Comment.updateMany(
      { author: userId }, 
      { content: '[Commentaire supprimé]', isAnonymous: true, author: null }
    );
    
    // Supprimer les interactions (likes, sameFeelings, reactions)
    await Post.updateMany(
      { 
        $or: [
          { 'likes': userId },
          { 'sameFeelings': userId },
          { 'reactions.user': userId }
        ]
      },
      { 
        $pull: { 
          likes: userId, 
          sameFeelings: userId,
          reactions: { user: userId }
        }
      }
    );
    
    // Supprimer les commentaires likes
    await Comment.updateMany(
      { 'likes': userId },
      { $pull: { likes: userId } }
    );
    
    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);
    
    console.log(`✅ [RGPD] Compte supprimé: ${userId}`);
    
    res.json({ message: 'Compte supprimé. Tes données personnelles ont été effacées.' });
  } catch (err) { 
    console.error('❌ [DELETE_ACCOUNT] Erreur:', err);
    next(err); 
  }
});

// ─── Export données (RGPD) ─────────────────────────────────────────────────────
router.get('/me/export', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken -otp -otpExpires -fcmToken -activityLog')
      .lean();
    
    const moodHistory = await Mood.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(365)
      .lean();
    
    const { ChallengeCompletion } = require('../models/challenge.model');
    const challenges = await ChallengeCompletion.find({ user: req.user._id })
      .populate('challenge', 'title category')
      .limit(500)
      .lean();
    
    // Inclure les posts et commentaires pour conformité RGPD complète
    const posts = await Post.find({ author: req.user._id })
      .select('content postType createdAt likesCount commentsCount')
      .limit(1000)
      .lean();
    
    const comments = await Comment.find({ author: req.user._id })
      .select('content post createdAt')
      .limit(1000)
      .lean();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      userInfo: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        legalAccepted: user.legalAccepted,
      },
      profile: user,
      moodHistory,
      challengeHistory: challenges,
      posts,
      comments,
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="linkmind-data-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (err) { 
    console.error('❌ [EXPORT] Erreur:', err);
    next(err); 
  }
});

// ─── Classement ─────────────────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 100); // Max 100
    
    const users = await User.find({ isActive: true })
      .select('name avatar level totalPoints streakDays')
      .sort({ totalPoints: -1 })
      .limit(parsedLimit)
      .lean();
    
    const totalUsers = await User.countDocuments({ isActive: true });
    
    // Trouver le rang de l'utilisateur connecté
    let myRank = null;
    const userInTop = users.find(u => u._id.toString() === req.user._id.toString());
    
    if (userInTop) {
      myRank = users.findIndex(u => u._id.toString() === req.user._id.toString()) + 1;
    } else {
      // Si l'utilisateur n'est pas dans le top, compter combien sont au-dessus
      const userPoints = await User.findById(req.user._id).select('totalPoints');
      myRank = await User.countDocuments({ 
        isActive: true, 
        totalPoints: { $gt: userPoints.totalPoints } 
      }) + 1;
    }
    
    res.json({ leaderboard: users, myRank, total: totalUsers });
  } catch (err) { 
    console.error('❌ [LEADERBOARD] Erreur:', err);
    next(err); 
  }
});

// ─── Rapport PDF (Premium) ─────────────────────────────────────────────────────
router.get('/me/report', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    
    if (!user.isPremium) {
      return res.status(403).json({ 
        error: 'premium_required', 
        message: 'Les rapports PDF sont réservés aux membres Premium. 👑' 
      });
    }
    
    const since = new Date();
    since.setDate(since.getDate() - 14);
    
    const moodHistory = await Mood.find({ 
      user: req.user._id, 
      createdAt: { $gte: since } 
    })
      .sort({ createdAt: 1 })
      .select('score label createdAt')
      .lean();
    
    const moodData = moodHistory.map(m => ({ 
      score: m.score, 
      label: m.label, 
      date: m.createdAt 
    }));
    
    const { ChallengeCompletion } = require('../models/challenge.model');
    let challenges = [];
    try {
      challenges = await ChallengeCompletion.find({ user: req.user._id })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate('challenge', 'title icon category')
        .lean();
    } catch (_) {}
    
    const badgesData = await getAllBadges(user);
    const pdfBuffer = await generateReport(user, moodData, challenges, badgesData);
    
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="linkmind-rapport-${dateStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) { 
    console.error('❌ [REPORT] Erreur:', err);
    next(err); 
  }
});

module.exports = router;