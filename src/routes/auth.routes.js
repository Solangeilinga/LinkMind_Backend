const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const resetController = require('../controllers/reset.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const User = require('../models/user.model');
const { sendVerificationEmail } = require('../services/email.service');
const { sendOTP } = require('../services/sms.service');

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
    
    // Déterminer quel canal doit être vérifié (priorité à l'email non vérifié)
    let channel = null;
    let destination = null;
    
    if (user.email && !user.isEmailVerified) {
      channel = 'email';
      destination = user.email;
    } else if (user.phone && !user.isPhoneVerified) {
      channel = 'sms';
      destination = user.phone;
    } else {
      return res.status(400).json({ 
        error: 'Aucune vérification nécessaire (tous les contacts sont déjà vérifiés).' 
      });
    }
    
    // Anti-spam : 2 minutes entre deux envois
    if (user.otpExpires && user.otpExpires > new Date(Date.now() - 2 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'Un code a déjà été envoyé récemment. Attends 2 minutes.' 
      });
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
    
    // Masquage de la destination pour l'affichage
    let maskedDestination;
    if (channel === 'email') {
      maskedDestination = destination.replace(/(.{2})(.*)(@.*)/, '$2***$3');
    } else {
      const phoneStr = destination.toString();
      maskedDestination = phoneStr.length > 4 ? `****${phoneStr.slice(-4)}` : phoneStr;
    }
    
    res.json({
      message: `Code envoyé par ${channel === 'email' ? 'email' : 'SMS'}`,
      channel,
      destination: maskedDestination,
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
    
    // Vérifier si le compte est déjà complètement vérifié
    const isEmailAlreadyVerified = user.email && user.isEmailVerified;
    const isPhoneAlreadyVerified = user.phone && user.isPhoneVerified;
    if (isEmailAlreadyVerified && (!user.phone || isPhoneAlreadyVerified)) {
      return res.status(400).json({ error: 'Compte déjà vérifié' });
    }
    
    if (!user.otp || user.otp !== code) {
      return res.status(400).json({ error: 'Code incorrect' });
    }
    
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'Code expiré. Demandes-en un nouveau.' });
    }
    
    // Mettre à jour le champ correspondant au canal utilisé
    if (user.otpChannel === 'email') {
      user.isEmailVerified = true;
    } else if (user.otpChannel === 'sms') {
      user.isPhoneVerified = true;
    }
    
    user.otp = null;
    user.otpExpires = null;
    await user.save({ validateBeforeSave: false });
    
    console.log(`✅ [VERIFY] Utilisateur ${user._id} vérifié via ${user.otpChannel}`);
    
    res.json({ 
      message: 'Compte vérifié avec succès ✅', 
      verified: true,
      channel: user.otpChannel,
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
    
    // Déterminer quel canal doit être vérifié (priorité à l'email non vérifié)
    let channel = null;
    let destination = null;
    
    if (user.email && !user.isEmailVerified) {
      channel = 'email';
      destination = user.email;
    } else if (user.phone && !user.isPhoneVerified) {
      channel = 'sms';
      destination = user.phone;
    } else {
      return res.status(400).json({ 
        error: 'Aucune vérification nécessaire (tous les contacts sont déjà vérifiés).' 
      });
    }
    
    const lastAttempt = user.lastVerificationSent;
    if (lastAttempt && (Date.now() - new Date(lastAttempt).getTime()) < 60 * 1000) {
      return res.status(429).json({ 
        error: 'Veuillez attendre 1 minute avant de renvoyer un code.' 
      });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpChannel = channel;
    user.lastVerificationSent = new Date();
    await user.save({ validateBeforeSave: false });
    
    if (channel === 'email') {
      await sendVerificationEmail(destination, code);
      console.log(`📧 [RESEND VERIFICATION] ${destination} → code: ${code}`);
    } else {
      await sendOTP(destination, code);
      console.log(`📱 [RESEND VERIFICATION] ${destination} → code: ${code}`);
    }
    
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