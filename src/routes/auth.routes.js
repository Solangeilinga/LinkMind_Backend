const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const resetController = require('../controllers/reset.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const User = require('../models/user.model');
const { sendVerificationEmail } = require('../services/email.service');
const { sendOTP } = require('../services/sms.service'); // ✅ AJOUTER

// ─── Rate limiting (inchangé) ─────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identifier = req.body.email || req.body.phone || 'unknown';
    return `${req.ip}:${identifier}`;
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Trop de tentatives d\'inscription. Réessayez plus tard.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    error: 'Trop de demandes. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: 'Trop de tentatives. Réessayez plus tard.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// ─── Validation personnalisée ─────────────────────────────────────────────────
const validateContactMethod = (value, { req }) => {
  if (!req.body.email && !req.body.phone) {
    throw new Error('Au moins un moyen de contact (email ou téléphone) est requis');
  }
  return true;
};

// ─── Inscription ───────────────────────────────────────────────────────────────
router.post('/register', registerLimiter, [
  body('firstName').trim().notEmpty().withMessage('Le prénom est requis'),
  body('lastName').trim().notEmpty().withMessage('Le nom est requis'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().normalizeEmail().withMessage('Format email invalide'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^(\+?\d{6,15})$/).withMessage('Format téléphone invalide (chiffres uniquement, 6-15 caractères)'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères'),
  body('age')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 15, max: 120 }).withMessage('Tu dois avoir au moins 15 ans pour utiliser LinkMind.'),
  body().custom(validateContactMethod),
], authController.register);

// ─── Authentification ──────────────────────────────────────────────────────────
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.patch('/change-password', authenticate, authController.changePassword);

// ─── Reset password (OTP flow) ────────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordLimiter, resetController.forgotPassword);
router.post('/verify-otp', resetController.verifyOtp);
router.post('/reset-password', resetPasswordLimiter, resetController.resetPassword);

// ─── Vérification (Email ou SMS) ──────────────────────────────────────────────
router.post('/send-verification', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.email && !user.phone) {
      return res.status(400).json({ 
        error: 'Aucun moyen de contact pour la vérification. Ajoute un email ou un téléphone.' 
      });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ error: 'Compte déjà vérifié' });
    }
    
    // Anti-spam
    if (user.otpExpires && user.otpExpires > new Date(Date.now() - 2 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'Un code a déjà été envoyé récemment. Attends 2 minutes.' 
      });
    }
    
    // ✅ Déterminer le canal (priorité email si disponible)
    let channel = 'email';
    let destination = user.email;
    
    if (!destination && user.phone) {
      channel = 'sms';
      destination = user.phone;
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpChannel = channel;
    user.lastVerificationSent = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Envoi selon le canal
    if (channel === 'email') {
      await sendVerificationEmail(destination, code);
      console.log(`📧 [VERIFY] ${destination} → code: ${code}`);
    } else {
      await sendOTP(destination, code);
      console.log(`📱 [VERIFY] ${destination} → code: ${code}`);
    }
    
    res.json({
      message: `Code envoyé par ${channel === 'email' ? 'email' : 'SMS'}`,
      channel,
      destination: channel === 'email' ? user.email?.replace(/(.{2})(.*)(@.*)/, '$2***$3') : user.phone?.slice(-4),
      expiresIn: 600,
      ...(process.env.NODE_ENV !== 'production' && { code }),
    });
  } catch (err) { 
    console.error('❌ [SEND_VERIFICATION] Erreur:', err);
    next(err); 
  }
});

// ─── Vérification du code (Email ou SMS) ──────────────────────────────────────
router.post('/verify-email', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;
    
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Code invalide. Format à 6 chiffres requis.' });
    }
    
    const user = await User.findById(req.user._id).select('+otp +otpExpires');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ error: 'Compte déjà vérifié' });
    }
    
    if (!user.otp || user.otp !== code) {
      return res.status(400).json({ error: 'Code incorrect' });
    }
    
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'Code expiré. Demandes-en un nouveau.' });
    }
    
    // ✅ Marquer le compte comme vérifié
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save({ validateBeforeSave: false });
    
    console.log(`✅ [VERIFY] Utilisateur ${user._id} vérifié via ${user.otpChannel}`);
    
    res.json({ 
      message: 'Compte vérifié avec succès ✅', 
      verified: true,
    });
  } catch (err) { 
    console.error('❌ [VERIFY] Erreur:', err);
    next(err); 
  }
});

// ─── Renvoyer le code de vérification ─────────────────────────────────────────
router.post('/resend-verification', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.email && !user.phone) {
      return res.status(400).json({ error: 'Aucun moyen de contact pour la vérification.' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ error: 'Compte déjà vérifié' });
    }
    
    const lastAttempt = user.lastVerificationSent;
    if (lastAttempt && (Date.now() - new Date(lastAttempt).getTime()) < 60 * 1000) {
      return res.status(429).json({ 
        error: 'Veuillez attendre 1 minute avant de renvoyer un code.' 
      });
    }
    
    // ✅ Déterminer le canal
    let channel = 'email';
    let destination = user.email;
    
    if (!destination && user.phone) {
      channel = 'sms';
      destination = user.phone;
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpChannel = channel;
    user.lastVerificationSent = new Date();
    await user.save({ validateBeforeSave: false });
    
    if (channel === 'email') {
      await sendVerificationEmail(destination, code);
    } else {
      await sendOTP(destination, code);
    }
    
    console.log(`📧 [RESEND VERIFICATION] ${destination} → code: ${code}`);
    
    res.json({
      message: `Nouveau code envoyé par ${channel === 'email' ? 'email' : 'SMS'}`,
      channel,
      expiresIn: 600,
      ...(process.env.NODE_ENV !== 'production' && { code }),
    });
  } catch (err) {
    console.error('❌ [RESEND_VERIFICATION] Erreur:', err);
    next(err);
  }
});

module.exports = router;