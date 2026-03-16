// notification.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', (req, res) => {
  res.json({ notifications: [], unreadCount: 0 });
});

router.patch('/:id/read', (req, res) => {
  res.json({ message: 'Marked as read' });
});

module.exports = router;
