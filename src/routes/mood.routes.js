const express = require('express');
const router = express.Router();
const moodController = require('../controllers/mood.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/', moodController.logMood);
router.get('/today', moodController.getTodayMood);
router.get('/history', moodController.getMoodHistory);
router.get('/insights', moodController.getMoodInsights);

module.exports = router;
