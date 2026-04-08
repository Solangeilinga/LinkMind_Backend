// src/middleware/legal.middleware.js
// Vérifie que l'utilisateur a accepté les CGU avant d'accéder aux routes protégées.
// Routes exemptées : /auth/*, /users/accept-legal, /health

const EXEMPT_PATHS = [
  '/api/auth',
  '/api/users/accept-legal',
  '/health',
];

exports.requireLegalAccepted = (req, res, next) => {
  // Pas d'user = route publique, on laisse passer
  if (!req.user) return next();

  // Routes exemptées
  const isExempt = EXEMPT_PATHS.some(p => req.path.startsWith(p));
  if (isExempt) return next();

  // Vérifie l'acceptation
  if (!req.user.legalAccepted) {
    return res.status(403).json({
      error: 'legal_not_accepted',
      message: 'Tu dois accepter les conditions d\'utilisation pour continuer.',
      code: 'LEGAL_REQUIRED',
    });
  }

  next();
};