const User = require('../models/user.model');
const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes

/**
 * Middleware pour vérifier la session active
 */
exports.checkSessionTimeout = async (req, res, next) => {
  if (!req.user) return next();

  try {
    const user = await User.findById(req.user._id);
    if (!user) return next();

    const lastActivity = user.lastActivity || user.createdAt;
    const inactiveTime = Date.now() - new Date(lastActivity).getTime();

    if (inactiveTime > SESSION_TIMEOUT) {
      return res.status(401).json({ 
        error: 'Session expirée', 
        code: 'SESSION_EXPIRED',
        message: 'Veuillez vous reconnecter'
      });
    }

    // ✅ CORRIGÉ: updateOne au lieu de save()
    await User.updateOne(
      { _id: user._id }, 
      { lastActivity: new Date() }
    );

    next();
  } catch (err) {
    console.error('Session timeout error:', err);
    next();
  }
};

/**
 * Middleware pour les routes qui ne nécessitent pas de timeout strict
 */
exports.refreshSession = async (req, res, next) => {
  if (req.user) {
    // ✅ CORRIGÉ: updateOne au lieu de findByIdAndUpdate
    await User.updateOne(
      { _id: req.user._id }, 
      { lastActivity: new Date() }
    ).catch(() => {});
  }
  next();
};