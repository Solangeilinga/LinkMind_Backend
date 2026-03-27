const User = require('../models/user.model');

/**
 * Middleware de rate limiting basé sur les restrictions
 */
exports.applyRateLimit = async (req, res, next) => {
  if (!req.user) return next();
  
  try {
    const user = await User.findById(req.user._id);
    
    if (user.restricted && user.restrictedUntil > new Date()) {
      return res.status(429).json({
        error: 'Compte restreint temporairement',
        message: `Activité restreinte jusqu'au ${new Date(user.restrictedUntil).toLocaleString()}`,
        until: user.restrictedUntil,
        code: 'ACCOUNT_RESTRICTED'
      });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};