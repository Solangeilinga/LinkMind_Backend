const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    res.json({ notifications, unreadCount, page: parseInt(page) });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
exports.deleteOne = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/notifications
exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// POST /api/notifications/fcm-token
exports.registerFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requis' });
    await require('../models/user.model').findByIdAndUpdate(req.user._id, { fcmToken: token });
    res.json({ ok: true });
  } catch (err) { next(err); }
};