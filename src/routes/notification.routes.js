const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const c = require('../controllers/notification.controller');

router.use(authenticate);

router.get('/',                    c.getNotifications);
router.patch('/read-all',          c.markAllRead);
router.patch('/:id/read',          c.markRead);
router.delete('/',                 c.clearAll);
router.delete('/:id',              c.deleteOne);
router.post('/fcm-token',          c.registerFcmToken);

module.exports = router;