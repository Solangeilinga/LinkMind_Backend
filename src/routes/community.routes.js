const express = require('express');
const router = express.Router();
const c = require('../controllers/community.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);

// Routes de signalement (accessibles à tous)
router.post('/posts/:id/report', c.reportPost);
router.post('/comments/:id/report', c.reportComment);
router.post('/professionals/:id/report', c.reportProfessional);

// Routes existantes...
router.get('/feed', c.getFeed);
router.get('/my-posts', c.getMyPosts);
router.post('/posts', c.createPost);
router.post('/posts/:id/like', c.toggleLike);
router.post('/posts/:id/same-feeling', c.toggleSameFeeling);
router.post('/posts/:id/react',         c.toggleReaction);
router.get('/search',                   c.searchPosts);
router.delete('/posts/:id', c.deletePost);
router.get('/posts/:id/comments', c.getComments);
router.post('/posts/:id/comments', c.addComment);
router.post('/posts/:id/comments/:commentId/like', c.toggleCommentLike);

module.exports = router;