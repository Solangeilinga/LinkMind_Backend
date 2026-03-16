const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const assistantController = require('../controllers/assistant.controller');
const rateLimit = require('express-rate-limit');

const assistantLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de messages. Attends quelques minutes avant de continuer.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

router.post('/chat', authenticate, assistantLimit, assistantController.chat);
router.delete('/session', authenticate, assistantController.clearSession);

module.exports = router;