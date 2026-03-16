const { Post, Comment, GroupChallenge } = require('../models/community.model');

// Helper: serialize a comment — author must already be populated
const serializeComment = (comment, userId) => {
  const obj = typeof comment.toObject === 'function' ? comment.toObject() : { ...comment };
  const alias = obj.author?.anonymousAlias || null;
  obj.author = { anonymousAlias: alias };
  obj.isLiked = (obj.likes || []).map(id => id.toString()).includes(userId);
  obj.likesCount = (obj.likes || []).length;
  obj.replies = obj.replies || [];
  return obj;
};

// ─── Feed ──────────────────────────────────────────────────────────────────────
exports.getFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id.toString();

    const posts = await Post.find({ isVisible: true })
      .populate('author', 'anonymousAlias')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const result = posts.map(post => {
      const obj = post.toObject();
      const alias = post.author?.anonymousAlias || null;
      obj.authorId       = post.author?._id ? post.author._id.toString() : post.author.toString();
      obj.isMine         = obj.authorId === userId;
      obj.anonymousAlias = alias;
      obj.author         = { anonymousAlias: alias };
      obj.isLiked        = post.likes.map(id => id.toString()).includes(userId);
      obj.likesCount     = post.likes.length;
      return obj;
    });

    const total = await Post.countDocuments({ isVisible: true });
    res.json({ posts: result, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ─── My posts ──────────────────────────────────────────────────────────────────
exports.getMyPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const posts = await Post.find({ author: userId, isVisible: true })
      .populate('author', 'anonymousAlias')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const result = posts.map(post => {
      const obj = post.toObject();
      const alias = post.author?.anonymousAlias || null;
      obj.authorId       = userId.toString();
      obj.isMine         = true;
      obj.anonymousAlias = alias;
      obj.author         = { anonymousAlias: alias };
      obj.isLiked        = post.likes.map(id => id.toString()).includes(userId.toString());
      obj.likesCount     = post.likes.length;
      return obj;
    });

    res.json({ posts: result, total: result.length });
  } catch (err) { next(err); }
};

// ─── Create post ───────────────────────────────────────────────────────────────
exports.createPost = async (req, res, next) => {
  try {
    const { content, postType, moodRef, challengeRef, moodScore } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const post = await Post.create({
      author: req.user._id,
      content: content.trim(),
      postType: postType || 'feeling',
      moodRef, challengeRef, moodScore,
      isAnonymous: true,
    });

    // Populate to get alias
    await post.populate('author', 'anonymousAlias');
    const obj = post.toObject();
    const alias = post.author?.anonymousAlias || null;
    obj.anonymousAlias = alias;
    obj.author         = { anonymousAlias: alias };
    obj.isLiked        = false;
    obj.likesCount     = 0;
    obj.isMine         = true;
    obj.authorId       = req.user._id.toString();
    res.status(201).json({ post: obj });
  } catch (err) { next(err); }
};

// ─── Like / unlike a post ──────────────────────────────────────────────────────
exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post?.isVisible) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user._id;
    const idx = post.likes.findIndex(id => id.toString() === userId.toString());
    if (idx === -1) post.likes.push(userId);
    else post.likes.splice(idx, 1);
    post.likesCount = post.likes.length;
    await post.save();

    res.json({ liked: idx === -1, likesCount: post.likes.length });
  } catch (err) { next(err); }
};

// ─── Get comments (threaded, Facebook style) ──────────────────────────────────
exports.getComments = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id.toString();

    const post = await Post.findById(postId);
    const isPostAuthor = post && post.author.toString() === userId;

    const filter = { post: postId, isVisible: true };
    if (!isPostAuthor) filter.isPrivate = { $ne: true };

    const allComments = await Comment.find(filter)
      .populate('author', 'anonymousAlias')
      .sort({ createdAt: 1 });

    // Build tree: top-level + replies
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
  } catch (err) { next(err); }
};

// ─── Add comment or reply ──────────────────────────────────────────────────────
exports.addComment = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { content, isPrivate, parentCommentId } = req.body;

    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const post = await Post.findById(postId);
    if (!post?.isVisible) return res.status(404).json({ error: 'Post not found' });

    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content: content.trim(),
      isAnonymous: true,
      isPrivate: isPrivate || false,
      parentComment: parentCommentId || null,
    });

    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
    } else {
      await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    }

    // Populate author for alias
    await comment.populate('author', 'anonymousAlias');
    const obj = serializeComment(comment, req.user._id.toString());
    obj.replies = [];
    res.status(201).json({ comment: obj });
  } catch (err) { next(err); }
};

// ─── Like / unlike a comment ───────────────────────────────────────────────────
exports.toggleCommentLike = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment?.isVisible) return res.status(404).json({ error: 'Comment not found' });

    const userId = req.user._id;
    const idx = comment.likes.findIndex(id => id.toString() === userId.toString());
    if (idx === -1) comment.likes.push(userId);
    else comment.likes.splice(idx, 1);
    comment.likesCount = comment.likes.length;
    await comment.save();

    res.json({ liked: idx === -1, likesCount: comment.likes.length });
  } catch (err) { next(err); }
};

// ─── Report post ───────────────────────────────────────────────────────────────
exports.reportPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const already = post.reports?.some(r => r.user?.toString() === req.user._id.toString());
    if (already) return res.status(409).json({ error: 'Already reported' });

    post.reports.push({ user: req.user._id, reason: req.body.reason, reportedAt: new Date() });
    post.reportCount = (post.reportCount || 0) + 1;
    if (post.reportCount >= 5) post.isVisible = false;
    await post.save();

    res.json({ message: 'Signalement pris en compte.' });
  } catch (err) { next(err); }
};

// ─── Group challenges ──────────────────────────────────────────────────────────
exports.getGroupChallenges = async (req, res, next) => {
  try {
    const now = new Date();
    const challenges = await GroupChallenge.find({ isActive: true, endDate: { $gte: now } })
      .populate('challenge', 'title icon category durationMinutes')
      .sort({ endDate: 1 });

    const userId = req.user._id.toString();
    const result = challenges.map(gc => ({
      ...gc.toObject(),
      isParticipating: gc.participants.map(id => id.toString()).includes(userId),
      isCompleted:     gc.completions.map(id => id.toString()).includes(userId),
      progressPercent: Math.round((gc.completionsCount / gc.targetParticipants) * 100),
      daysLeft: Math.max(0, Math.ceil((new Date(gc.endDate) - now) / 86400000)),
    }));

    res.json({ groupChallenges: result });
  } catch (err) { next(err); }
};

exports.joinGroupChallenge = async (req, res, next) => {
  try {
    const gc = await GroupChallenge.findById(req.params.id);
    if (!gc?.isActive) return res.status(404).json({ error: 'Group challenge not found' });

    const userId = req.user._id;
    if (!gc.participants.includes(userId)) {
      gc.participants.push(userId);
      gc.participantsCount++;
      await gc.save();
    }
    res.json({ message: 'Joined', participantsCount: gc.participantsCount });
  } catch (err) { next(err); }
};