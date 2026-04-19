// middleware/legal.middleware.js
// Vérifie que l'utilisateur a accepté les CGU avant d'accéder aux routes protégées.
// Exemptions : routes d'authentification, acceptation des CGU, health check.

const EXEMPT_PATHS = [
  '/api/auth',              // login, register, forgot-password, etc.
  '/api/users/accept-legal', // point d'acceptation des CGU
  '/health',                // health check public
];

exports.requireLegalAccepted = (req, res, next) => {
  // 1. Si pas d'utilisateur (route publique), laisser passer
  if (!req.user) return next();

  // 2. Construire le chemin complet (supporte les sous-routeurs)
  //    req.originalUrl contient toujours le chemin complet.
  const fullPath = req.originalUrl || req.baseUrl + (req.path || '');

  // 3. Vérifier si le chemin actuel est exempté
  const isExempt = EXEMPT_PATHS.some(exemptPath => fullPath.startsWith(exemptPath));
  if (isExempt) return next();

  // 4. Sinon, exiger legalAccepted = true
  if (!req.user.legalAccepted) {
    return res.status(403).json({
      error: 'legal_not_accepted',
      message: 'Tu dois accepter les conditions d\'utilisation pour continuer.',
      code: 'LEGAL_REQUIRED',
    });
  }

  next();
};