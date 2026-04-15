const { Post, Comment, GroupChallenge } = require('../models/community.model');
const User = require('../models/user.model');
const SuspiciousActivityService = require('../services/suspicious.service');
const notifService = require('../services/notification.service');
const { checkCommunityBadges } = require('../services/community-badge.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────────
const REACTION_TYPES = ['heart', 'hug', 'strong', 'fire'];

/**
 * Sérialise un commentaire pour l'API
 * @param {Object} comment - Document commentaire (author déjà populated)
 * @param {string} userId - ID de l'utilisateur connecté
 * @returns {Object} Commentaire sérialisé
 */
const serializeComment = (comment, userId) => {
  const obj = typeof comment.toObject === 'function' ? comment.toObject() : { ...comment };
  const alias = obj.author?.anonymousAlias || null;
  obj.author = { anonymousAlias: alias };
  obj.isLiked = (obj.likes || []).map(id => id.toString()).includes(userId);
  obj.likesCount = (obj.likes || []).length;
  obj.replies = obj.replies || [];
  return obj;
};

/**
 * Construit le résumé des réactions d'un post
 * @param {Array} reactions - Tableau des réactions
 * @param {string} userId - ID de l'utilisateur connecté
 * @returns {Array} Résumé des réactions
 */
const buildReactionSummary = (reactions, userId) => {
  return REACTION_TYPES.map(t => ({
    type: t,
    count: reactions.filter(r => r.type === t).length,
    isMine: reactions.some(r => r.user.toString() === userId && r.type === t),
  })).filter(r => r.count > 0);
};

/**
 * Sérialise un post pour l'API
 * @param {Object} post - Document post (author déjà populated)
 * @param {string} userId - ID de l'utilisateur connecté
 * @returns {Object} Post sérialisé
 */
const serializePost = (post, userId) => {
  // ✅ CORRECTION : Gère le cas où le post vient d'une requête avec .lean()
  const obj = typeof post.toObject === 'function' ? post.toObject() : { ...post };
  
  const alias = obj.author?.anonymousAlias || null;
  const authorId = obj.author?._id ? obj.author._id.toString() : (obj.author?.toString() || null);
  
  obj.authorId = authorId;
  obj.isMine = authorId === userId;
  obj.anonymousAlias = alias;
  obj.author = { anonymousAlias: alias };
  
  // Sécuriser les map() au cas où les tableaux seraient null/undefined
  obj.isLiked = (obj.likes || []).map(id => id.toString()).includes(userId);
  obj.likesCount = (obj.likes || []).length;
  
  obj.isSameFeeling = (obj.sameFeelings || []).map(id => id.toString()).includes(userId);
  obj.sameFeelingsCount = (obj.sameFeelings || []).length;
  
  obj.reactions = buildReactionSummary(obj.reactions || [], userId);
  
  return obj;
};

// ─── Feed ──────────────────────────────────────────────────────────────────────────
exports.getFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id.toString();
    const skip = (page - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const filter = {
      $or: [
        { isVisible: true },
        { isVisible: { $exists: false } }
      ]
    };

    // Utiliser lean() pour de meilleures performances
    const posts = await Post.find(filter)
      .select('content postType moodEmoji moodRef challengeRef moodScore createdAt likes sameFeelings reactions author')
      .populate('author', '_id anonymousAlias')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    console.log(`📊 [FEED] Posts trouvés: ${posts.length}`);

    const result = posts.map(post => serializePost(post, userId));
    
    // Optimisation: compter uniquement si nécessaire (mettre en cache)
    const total = await Post.countDocuments(filter);
    
    res.json({ 
      posts: result, 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / parsedLimit) 
    });
  } catch (err) { 
    console.error('❌ [FEED] Erreur:', err);
    next(err); 
  }
};

// ─── My posts ──────────────────────────────────────────────────────────────────────
exports.getMyPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const filter = {
      author: userId,
      $or: [
        { isVisible: true },
        { isVisible: { $exists: false } }
      ]
    };

    const posts = await Post.find(filter)
      .select('content postType moodEmoji moodRef challengeRef moodScore createdAt likes sameFeelings reactions author')
      .populate('author', 'anonymousAlias')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    console.log(`📊 [MY_POSTS] Posts trouvés: ${posts.length}`);

    // CORRECTION BUG: compter le vrai total
    const total = await Post.countDocuments(filter);

    const result = posts.map(post => ({
      ...serializePost(post, userId.toString()),
      isMine: true,
      authorId: userId.toString()
    }));

    res.json({ posts: result, total, page: parseInt(page), pages: Math.ceil(total / parsedLimit) });
  } catch (err) { 
    console.error('❌ [MY_POSTS] Erreur:', err);
    next(err); 
  }
};

// ─── Create post ──────────────────────────────────────────────────────────────────
exports.createPost = async (req, res, next) => {
  try {
    const { content, postType, moodRef, challengeRef, moodScore, moodEmoji } = req.body;
    
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validation du postType
    const validPostTypes = ['feeling', 'challenge', 'mood', 'question', 'support'];
    const finalPostType = postType && validPostTypes.includes(postType) ? postType : 'feeling';

    console.log('📝 [CREATE] Création d\'un nouveau post...');
    console.log('  Content:', content.trim().substring(0, 50));
    console.log('  User:', req.user._id);
    console.log('  Type:', finalPostType);

    const post = await Post.create({
      author: req.user._id,
      content: content.trim(),
      postType: finalPostType,
      moodEmoji: moodEmoji || null,
      moodRef,
      challengeRef,
      moodScore,
      isAnonymous: true,
      isVisible: true,
    });

    await post.populate('author', 'anonymousAlias');
    
    const obj = serializePost(post, req.user._id.toString());
    obj.isMine = true;
    
    console.log('✅ [CREATE] Post créé avec ID:', post._id);
    
    // 🔒 Sécurité
    await SuspiciousActivityService.recordActivity(
      req.user._id, 'post',
      { postId: post._id, postType: finalPostType },
      req.ip, req.headers['user-agent']
    );

    // 🏅 Badges communauté
    const newBadges = await checkCommunityBadges(req.user._id, 'post').catch(() => []);
    
    res.status(201).json({ post: obj, newBadges });
  } catch (err) { 
    console.error('❌ [CREATE] Erreur:', err);
    next(err); 
  }
};

// ─── Edit post (dans les 24h) ─────────────────────────────────────────────────────
exports.editPost = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { content } = req.body;
    
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Contenu requis' });
    }
    
    if (content.trim().length > 1500) {
      return res.status(400).json({ error: 'Trop long (max 1500 caractères)' });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post || post.isVisible === false) {
      return res.status(404).json({ error: 'Post introuvable' });
    }
    
    if (post.author.toString() !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }
    
    const age = Date.now() - new Date(post.createdAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      return res.status(403).json({ error: 'Tu ne peux modifier un post que dans les 24 premières heures.' });
    }
    
    post.content = content.trim();
    post.editedAt = new Date();
    await post.save();
    
    res.json({ 
      post: { 
        _id: post._id, 
        content: post.content, 
        editedAt: post.editedAt 
      } 
    });
  } catch (err) { 
    console.error('❌ [EDIT_POST] Erreur:', err);
    next(err); 
  }
};

// ─── Like / unlike a post ─────────────────────────────────────────────────────────
// ─── Like / unlike a post (CORRIGÉ AVEC OPÉRATEURS ATOMIQUES) ───────────────
exports.toggleLike = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 1. On vérifie juste si le post existe et l'état actuel pour ce user
    const post = await Post.findById(req.params.id).select('likes isVisible');
    if (!post || post.isVisible === false) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const wasLiked = post.likes.some(id => id.toString() === userId.toString());
    
    // 2. Mise à jour atomique (thread-safe)
    const updateOp = wasLiked 
      ? { $pull: { likes: userId } } 
      : { $addToSet: { likes: userId } };

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id, 
      updateOp, 
      { new: true } // Renvoie le document mis à jour
    ).select('likes');

    // 3. Sécurité / Activité
    await SuspiciousActivityService.recordActivity(
      userId, 'like',
      { postId: req.params.id, liked: !wasLiked },
      req.ip, req.headers['user-agent']
    );

    res.json({ liked: !wasLiked, likesCount: updatedPost.likes.length });
  } catch (err) { 
    console.error('❌ [TOGGLE_LIKE] Erreur:', err);
    next(err); 
  }
};

// ─── "Moi aussi" — toggle same feeling (CORRIGÉ) ────────────────────────────
exports.toggleSameFeeling = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const post = await Post.findById(req.params.id).select('sameFeelings isVisible author');
    if (!post || post.isVisible === false) {
      return res.status(404).json({ error: 'Post introuvable' });
    }

    const wasAdded = post.sameFeelings.some(id => id.toString() === userId.toString());
    
    const updateOp = wasAdded 
      ? { $pull: { sameFeelings: userId } } 
      : { $addToSet: { sameFeelings: userId } };

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id, 
      updateOp, 
      { new: true }
    ).select('sameFeelings');

    const newCount = updatedPost.sameFeelings.length;

    if (!wasAdded) {
      // Exécuté en arrière-plan (sans await bloquant pour le client si possible)
      notifService.notifySameFeeling({
        postAuthorId: post.author,
        senderId: userId,
        postId: post._id,
        count: newCount,
      }).catch(() => {});
      
      checkCommunityBadges(userId, 'same_feeling').catch(() => {});
    }

    res.json({
      sameFeeling: !wasAdded,
      sameFeelingsCount: newCount,
    });
  } catch (err) { 
    console.error('❌ [SAME_FEELING] Erreur:', err);
    next(err); 
  }
};

// ─── Réactions multiples (CORRIGÉ AVEC ARRAYFILTERS) ─────────────────────────
exports.toggleReaction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type } = req.body;
    
    if (!REACTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `Type invalide. Valeurs: ${REACTION_TYPES.join(', ')}` });
    }

    const post = await Post.findById(req.params.id).select('reactions isVisible author');
    if (!post || post.isVisible === false) {
      return res.status(404).json({ error: 'Post introuvable' });
    }

    const existingReaction = post.reactions.find(r => r.user.toString() === userId.toString());
    let added = false;
    let updatedPost;

    if (!existingReaction) {
      // Nouvelle réaction : on push atomiquement
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $push: { reactions: { user: userId, type } } },
        { new: true }
      );
      added = true;
    } else if (existingReaction.type === type) {
      // Clic sur la même réaction : on la retire atomiquement
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $pull: { reactions: { user: userId } } },
        { new: true }
      );
    } else {
      // Changement de type (ex: heart -> fire) : on met à jour atomiquement
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $set: { "reactions.$[elem].type": type } },
        { arrayFilters: [{ "elem.user": userId }], new: true }
      );
      added = true;
    }

    const summary = REACTION_TYPES.map(t => ({
      type: t,
      count: updatedPost.reactions.filter(r => r.type === t).length,
      isMine: updatedPost.reactions.some(r => r.user.toString() === userId.toString() && r.type === t),
    })).filter(r => r.count > 0 || r.isMine);

    if (added) {
      const alias = req.user.anonymousAlias || '👤 Anonyme';
      notifService.notifyReaction({
        postAuthorId: post.author,
        senderId: userId,
        postId: post._id,
        reactionType: type,
        senderAlias: alias,
      }).catch(() => {});
      checkCommunityBadges(userId, 'reaction').catch(() => {});
    }

    res.json({ reactions: summary, myReaction: added ? type : null });
  } catch (err) { 
    console.error('❌ [REACTION] Erreur:', err);
    next(err); 
  }
};

// ─── Supprimer son propre post (soft delete) ──────────────────────────────────────
exports.deletePost = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post introuvable' });
    }
    
    if (post.author.toString() !== userId) {
      return res.status(403).json({ error: 'Tu ne peux supprimer que tes propres posts' });
    }
    
    post.isVisible = false;
    await post.save();
    
    res.json({ message: 'Post supprimé', deleted: true });
  } catch (err) { 
    console.error('❌ [DELETE_POST] Erreur:', err);
    next(err); 
  }
};

// ─── Get comments ─────────────────────────────────────────────────────────────────
exports.getComments = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id.toString();

    const post = await Post.findById(postId).select('author');
    const isPostAuthor = post && post.author.toString() === userId;

    const filter = { post: postId, isVisible: true };
    if (!isPostAuthor) filter.isPrivate = { $ne: true };

    const allComments = await Comment.find(filter)
      .populate('author', 'anonymousAlias')
      .sort({ createdAt: 1 })
      .lean();

    // Construire l'arbre des commentaires
    const map = {};
    const topLevel = [];

    allComments.forEach(c => {
      const obj = serializeComment(c, userId);
      obj.replies = [];
      map[c._id.toString()] = obj;
    });

    allComments.forEach(c => {
      const obj = map[c._id.toString()];
      if (c.parentComment) {
        const parent = map[c.parentComment.toString()];
        if (parent) parent.replies.push(obj);
        else topLevel.push(obj);
      } else {
        topLevel.push(obj);
      }
    });

    res.json({ comments: topLevel });
  } catch (err) { 
    console.error('❌ [GET_COMMENTS] Erreur:', err);
    next(err); 
  }
};

// ─── Add comment or reply ─────────────────────────────────────────────────────────
exports.addComment = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { content, isPrivate, parentCommentId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await Post.findById(postId);
    
    if (!post || post.isVisible === false) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content: content.trim(),
      isAnonymous: true,
      isPrivate: isPrivate || false,
      parentComment: parentCommentId || null,
    });

    // Mettre à jour les compteurs
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
    } else {
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    }

    await comment.populate('author', 'anonymousAlias');
    const obj = serializeComment(comment, req.user._id.toString());
    obj.replies = [];
    
    // 🔒 Sécurité
    await SuspiciousActivityService.recordActivity(
      req.user._id, 'comment',
      { postId, commentId: comment._id, parentCommentId },
      req.ip, req.headers['user-agent']
    );

    // 🔔 Notifications
    const senderAlias = req.user.anonymousAlias || '👤 Anonyme';
    
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId).select('author');
      if (parentComment) {
        await notifService.notifyReply({
          commentAuthorId: parentComment.author,
          senderId: req.user._id,
          postId,
          commentId: comment._id,
          senderAlias,
        }).catch(() => {});
      }
    } else {
      await notifService.notifyComment({
        postAuthorId: post.author,
        senderId: req.user._id,
        postId,
        commentId: comment._id,
        senderAlias,
      }).catch(() => {});
    }
    
    // 🏅 Badges
    const newBadges = await checkCommunityBadges(req.user._id, 'comment').catch(() => []);
    
    res.status(201).json({ comment: obj, newBadges });
  } catch (err) { 
    console.error('❌ [ADD_COMMENT] Erreur:', err);
    next(err); 
  }
};

// ─── Like / unlike a comment ──────────────────────────────────────────────────────
exports.toggleCommentLike = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    
    if (!comment || comment.isVisible === false) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const userId = req.user._id;
    const idx = comment.likes.findIndex(id => id.toString() === userId.toString());
    const wasLiked = idx === -1;
    
    if (wasLiked) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(idx, 1);
    }
    
    comment.likesCount = comment.likes.length;
    await comment.save();

    res.json({ liked: wasLiked, likesCount: comment.likes.length });
  } catch (err) { 
    console.error('❌ [TOGGLE_COMMENT_LIKE] Erreur:', err);
    next(err); 
  }
};

// ─── Group challenges ─────────────────────────────────────────────────────────────
exports.getGroupChallenges = async (req, res, next) => {
  try {
    const now = new Date();
    const challenges = await GroupChallenge.find({ 
      isActive: true, 
      endDate: { $gte: now } 
    })
      .populate('challenge', 'title icon category durationMinutes')
      .sort({ endDate: 1 })
      .lean();

    const userId = req.user._id.toString();
    const result = challenges.map(gc => ({
      ...gc,
      isParticipating: gc.participants?.map(id => id.toString()).includes(userId) || false,
      isCompleted: gc.completions?.map(id => id.toString()).includes(userId) || false,
      progressPercent: Math.round((gc.completionsCount / gc.targetParticipants) * 100),
      daysLeft: Math.max(0, Math.ceil((new Date(gc.endDate) - now) / 86400000)),
    }));

    res.json({ groupChallenges: result });
  } catch (err) { 
    console.error('❌ [GROUP_CHALLENGES] Erreur:', err);
    next(err); 
  }
};

exports.joinGroupChallenge = async (req, res, next) => {
  try {
    const gc = await GroupChallenge.findById(req.params.id);
    
    if (!gc?.isActive) {
      return res.status(404).json({ error: 'Group challenge not found' });
    }

    const userId = req.user._id;
    if (!gc.participants.includes(userId)) {
      gc.participants.push(userId);
      gc.participantsCount++;
      await gc.save();
    }
    
    res.json({ message: 'Joined', participantsCount: gc.participantsCount });
  } catch (err) { 
    console.error('❌ [JOIN_CHALLENGE] Erreur:', err);
    next(err); 
  }
};

// ─── Search posts (full-text) ─────────────────────────────────────────────────────
exports.searchPosts = async (req, res, next) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;
    const userId = req.user._id.toString();

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'La recherche doit faire au moins 2 caractères' });
    }

    const filter = {
      $text: { $search: q.trim() },
      $or: [{ isVisible: true }, { isVisible: { $exists: false } }],
    };
    
    if (type) filter.postType = type;

    const skip = (page - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const posts = await Post.find(filter, { score: { $meta: 'textScore' } })
      .select('content postType moodEmoji createdAt likes sameFeelings reactions author')
      .populate('author', '_id anonymousAlias')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const total = await Post.countDocuments(filter);

    const result = posts.map(post => serializePost(post, userId));

    res.json({ 
      posts: result, 
      total, 
      query: q, 
      page: parseInt(page),
      pages: Math.ceil(total / parsedLimit)
    });
  } catch (err) { 
    console.error('❌ [SEARCH] Erreur:', err);
    next(err); 
  }
};