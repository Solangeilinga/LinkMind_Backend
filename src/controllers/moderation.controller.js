const { Post, Comment, Professional, ModerationLog } = require('../models/community.model');
const User = require('../models/user.model');

// ─── Constantes pour la modération automatique ────────────────────────────────
const AUTO_MODERATION_RULES = {
  // Seuils pour les signalements
  REPORT_THRESHOLD: {
    post: 5,           // 5 signalements = masquage automatique
    comment: 3,        // 3 signalements = masquage automatique
    professional: 10   // 10 signalements = suspension automatique
  },
  // Mots interdits (regex)
  PROFANITY_PATTERNS: [
    /insulte/i, /conard/i, /pute/i, /merde/i,
    // Ajoute d'autres mots selon le contexte
  ],
  // Détection d'informations personnelles
  PHONE_PATTERN: /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  EMAIL_PATTERN: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  URL_PATTERN: /(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+\/?/,
};

// ─── Signalement d'un post ────────────────────────────────────────────────────
exports.reportPost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { reason, details } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post introuvable' });

    // Vérifier si l'utilisateur a déjà signalé
    const alreadyReported = post.reports.some(r => r.user.toString() === userId.toString());
    if (alreadyReported) {
      return res.status(409).json({ error: 'Vous avez déjà signalé ce post' });
    }

    // Ajouter le signalement
    post.reports.push({
      user: userId,
      reason,
      details,
      status: 'pending',
      reportedAt: new Date()
    });
    post.reportCount = post.reports.length;
    
    // Modération automatique
    const shouldHide = await checkAutoModeration(post, 'post');
    if (shouldHide) {
      post.isVisible = false;
    }
    
    await post.save();

    // Journaliser
    await ModerationLog.create({
      moderator: userId,
      targetType: 'post',
      targetId: postId,
      action: 'report',
      reason: reason,
      previousState: { isVisible: true },
      newState: { isVisible: post.isVisible }
    });

    res.json({ 
      message: 'Signalement pris en compte', 
      autoHidden: shouldHide,
      reportCount: post.reportCount 
    });
  } catch (err) { next(err); }
};

// ─── Signalement d'un commentaire ─────────────────────────────────────────────
exports.reportComment = async (req, res, next) => {
  try {
    const { id: commentId } = req.params;
    const { reason, details } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' });

    const alreadyReported = comment.reports.some(r => r.user.toString() === userId.toString());
    if (alreadyReported) {
      return res.status(409).json({ error: 'Vous avez déjà signalé ce commentaire' });
    }

    comment.reports.push({
      user: userId,
      reason,
      details,
      status: 'pending',
      reportedAt: new Date()
    });
    comment.reportCount = comment.reports.length;
    
    const shouldHide = await checkAutoModeration(comment, 'comment');
    if (shouldHide) {
      comment.isVisible = false;
    }
    
    await comment.save();

    res.json({ 
      message: 'Signalement pris en compte', 
      autoHidden: shouldHide 
    });
  } catch (err) { next(err); }
};

// ─── Signalement d'un professionnel ───────────────────────────────────────────
exports.reportProfessional = async (req, res, next) => {
  try {
    const { id: professionalId } = req.params;
    const { reason, details } = req.body;
    const userId = req.user._id;

    const professional = await Professional.findById(professionalId);
    if (!professional) return res.status(404).json({ error: 'Professionnel introuvable' });

    const alreadyReported = professional.reports.some(r => r.user.toString() === userId.toString());
    if (alreadyReported) {
      return res.status(409).json({ error: 'Vous avez déjà signalé ce professionnel' });
    }

    professional.reports.push({
      user: userId,
      reason,
      details,
      status: 'pending',
      reportedAt: new Date()
    });
    professional.reportCount = professional.reports.length;
    
    const shouldSuspend = professional.reportCount >= AUTO_MODERATION_RULES.REPORT_THRESHOLD.professional;
    if (shouldSuspend) {
      professional.isActive = false;
    }
    
    await professional.save();

    res.json({ 
      message: 'Signalement pris en compte', 
      suspended: shouldSuspend 
    });
  } catch (err) { next(err); }
};

// ─── Modération automatique ───────────────────────────────────────────────────
async function checkAutoModeration(content, type) {
  let flags = [];
  let shouldHide = false;
  
  // Détection des mots interdits
  for (const pattern of AUTO_MODERATION_RULES.PROFANITY_PATTERNS) {
    if (pattern.test(content.content || '')) {
      flags.push({ type: 'profanity', detectedAt: new Date() });
      shouldHide = true;
      break;
    }
  }
  
  // Détection des informations personnelles
  if (AUTO_MODERATION_RULES.PHONE_PATTERN.test(content.content || '')) {
    flags.push({ type: 'phone', detectedAt: new Date() });
    shouldHide = true;
  }
  
  if (AUTO_MODERATION_RULES.EMAIL_PATTERN.test(content.content || '')) {
    flags.push({ type: 'email', detectedAt: new Date() });
    shouldHide = true;
  }
  
  if (AUTO_MODERATION_RULES.URL_PATTERN.test(content.content || '')) {
    flags.push({ type: 'url', detectedAt: new Date() });
    // Ne pas cacher automatiquement les URLs, mais les flagger
  }
  
  // Ajouter les flags de modération
  if (flags.length > 0) {
    content.autoModerationFlags = content.autoModerationFlags || [];
    content.autoModerationFlags.push(...flags);
  }
  
  // Vérifier le seuil de signalements
  if (type === 'post' && content.reportCount >= AUTO_MODERATION_RULES.REPORT_THRESHOLD.post) {
    shouldHide = true;
  }
  
  if (type === 'comment' && content.reportCount >= AUTO_MODERATION_RULES.REPORT_THRESHOLD.comment) {
    shouldHide = true;
  }
  
  return shouldHide;
}

// ─── Admin: Liste des contenus signalés ───────────────────────────────────────
exports.getReportedContent = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const filter = { 'reports.status': status || 'pending' };
    
    let content = [];
    let total = 0;
    
    if (!type || type === 'post') {
      const posts = await Post.find(filter)
        .populate('author', 'firstName lastName anonymousAlias')
        .populate('reports.user', 'firstName lastName')
        .sort({ 'reports.reportedAt': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      content.push(...posts.map(p => ({ ...p.toObject(), contentType: 'post' })));
      total += await Post.countDocuments(filter);
    }
    
    if (!type || type === 'comment') {
      const comments = await Comment.find(filter)
        .populate('author', 'firstName lastName anonymousAlias')
        .populate('reports.user', 'firstName lastName')
        .sort({ 'reports.reportedAt': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      content.push(...comments.map(c => ({ ...c.toObject(), contentType: 'comment' })));
      total += await Comment.countDocuments(filter);
    }
    
    if (!type || type === 'professional') {
      const professionals = await Professional.find(filter)
        .select('firstName lastName type city reportCount reports')
        .sort({ 'reports.reportedAt': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      content.push(...professionals.map(p => ({ ...p.toObject(), contentType: 'professional' })));
      total += await Professional.countDocuments(filter);
    }
    
    res.json({ content, total, page: parseInt(page) });
  } catch (err) { next(err); }
};

// ─── Admin: Traiter un signalement ────────────────────────────────────────────
exports.resolveReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reportId } = req.params;
    const { action, moderationNote } = req.body;
    const moderatorId = req.user._id;
    
    let target;
    if (targetType === 'post') target = await Post.findById(targetId);
    else if (targetType === 'comment') target = await Comment.findById(targetId);
    else if (targetType === 'professional') target = await Professional.findById(targetId);
    else return res.status(400).json({ error: 'Type invalide' });
    
    if (!target) return res.status(404).json({ error: 'Contenu introuvable' });
    
    // Trouver le signalement
    const report = target.reports.id(reportId);
    if (!report) return res.status(404).json({ error: 'Signalement introuvable' });
    
    // Mettre à jour le signalement
    report.status = 'reviewed';
    report.reviewedAt = new Date();
    report.reviewedBy = moderatorId;
    report.action = action;
    
    // Appliquer l'action
    switch (action) {
      case 'hide':
        target.isVisible = false;
        break;
      case 'delete':
        await target.deleteOne();
        break;
      case 'warning':
        // Envoyer un avertissement à l'utilisateur
        await sendWarning(target.author, moderationNote);
        break;
      case 'suspend':
        if (targetType === 'professional') {
          target.isActive = false;
        }
        break;
      default:
        // 'none' - rien
        break;
    }
    
    await target.save();
    
    // Journaliser
    await ModerationLog.create({
      moderator: moderatorId,
      targetType,
      targetId,
      action,
      reason: moderationNote || report.reason,
      previousState: { isVisible: true },
      newState: { isVisible: target.isVisible }
    });
    
    res.json({ message: 'Signalement traité avec succès' });
  } catch (err) { next(err); }
};

// ─── Admin: Voir le journal de modération ─────────────────────────────────────
exports.getModerationLog = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const logs = await ModerationLog.find()
      .populate('moderator', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await ModerationLog.countDocuments();
    
    res.json({ logs, total, page: parseInt(page) });
  } catch (err) { next(err); }
};

// Fonction utilitaire pour envoyer un avertissement
async function sendWarning(userId, message) {
  try {
    const user = await User.findById(userId);
    if (user && user.email) {
      // Envoyer un email d'avertissement
      // Ou créer une notification
      console.log(`Avertissement envoyé à ${user.email}: ${message}`);
    }
  } catch (err) {
    console.error('Erreur envoi avertissement:', err);
  }
}