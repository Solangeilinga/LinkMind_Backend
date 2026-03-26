const express = require('express');
const router = express.Router();
const c = require('../controllers/community.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Posts
router.get('/feed',              c.getFeed);
router.get('/my-posts',          c.getMyPosts);
router.post('/posts',            c.createPost);
router.post('/posts/:id/like',        c.toggleLike);
router.post('/posts/:id/same-feeling',  c.toggleSameFeeling);
router.delete('/posts/:id',            c.deletePost);
router.post('/posts/:id/report', c.reportPost);

// Comments
router.get('/posts/:id/comments',                   c.getComments);
router.post('/posts/:id/comments',                  c.addComment);
router.post('/posts/:id/comments/:commentId/like',  c.toggleCommentLike);

// Group challenges
router.get('/group-challenges',          c.getGroupChallenges);
router.post('/group-challenges/:id/join',c.joinGroupChallenge);

module.exports = router;