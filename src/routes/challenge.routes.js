const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/daily', challengeController.getDailyChallenges);
router.get('/', challengeController.getAllChallenges);
router.post('/:id/complete', challengeController.completeChallenge);
router.patch('/completions/:completionId/feedback', challengeController.submitFeedback);
router.get('/history', challengeController.getHistory);

module.exports = router;
