const express = require('express');
const router = express.Router();
const c = require('../controllers/community.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const moderation = require('../controllers/moderation.controller'); 

router.use(authenticate);

// Routes de signalement (utilisant moderation.controller)
router.post('/posts/:id/report', moderation.reportPost);
router.post('/comments/:id/report', moderation.reportComment);
router.post('/professionals/:id/report', moderation.reportProfessional);

// Routes existantes...
router.get('/feed', c.getFeed);
router.get('/my-posts', c.getMyPosts);
router.post('/posts', c.createPost);
router.post('/posts/:id/like', c.toggleLike);
router.post('/posts/:id/same-feeling', c.toggleSameFeeling);
router.post('/posts/:id/react',         c.toggleReaction);
router.get('/search',                   c.searchPosts);
router.patch('/posts/:id', c.editPost);
router.delete('/posts/:id', c.deletePost);
router.get('/posts/:id/comments', c.getComments);
router.post('/posts/:id/comments', c.addComment);
router.post('/posts/:id/comments/:commentId/like', c.toggleCommentLike);
router.delete('/posts/:id/comments/:commentId', c.deleteComment);

// Group challenges
router.get('/group-challenges', c.getGroupChallenges);
router.post('/group-challenges/:id/join', c.joinGroupChallenge);

module.exports = router;