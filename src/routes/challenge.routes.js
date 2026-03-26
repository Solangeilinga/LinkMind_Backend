const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les défis
router.get('/daily', challengeController.getDailyChallenges);
router.get('/', challengeController.getAllChallenges);
router.get('/categories', challengeController.getChallengeCategories);
router.get('/difficulties', challengeController.getChallengeDifficulties);
router.get('/history', challengeController.getHistory);
router.get('/:id', challengeController.getChallengeById);

// Routes d'action
router.post('/:id/complete', challengeController.completeChallenge);
router.patch('/completions/:completionId/feedback', challengeController.submitFeedback);

module.exports = router;