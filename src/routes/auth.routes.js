const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const resetController = require('../controllers/reset.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const User = require('../models/user.model');
const { sendVerificationEmail } = require('../services/email.service');

// ─── Validation personnalisée ─────────────────────────────────────────────────
const validateContactMethod = (value, { req }) => {
  if (!req.body.email && !req.body.phone) {
    throw new Error('Au moins un moyen de contact (email ou téléphone) est requis');
  }
  return true;
};

const validateCode = (value) => {
  if (!value || !/^\d{6}$/.test(value)) {
    throw new Error('Code invalide. Format à 6 chiffres requis.');
  }
  return true;
};

// ─── Inscription ───────────────────────────────────────────────────────────────
router.post('/register', [
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
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.patch('/change-password', authenticate, authController.changePassword);

// ─── Reset password (OTP flow) ────────────────────────────────────────────────
router.post('/forgot-password', resetController.forgotPassword);
router.post('/verify-otp', resetController.verifyOtp);
router.post('/reset-password', resetController.resetPassword);

// ─── Vérification email ───────────────────────────────────────────────────────
router.post('/send-verification', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.email) {
      return res.status(400).json({ 
        error: 'Pas d\'email associé à ce compte. Ajoute un email dans ton profil.' 
      });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }
    
    // Anti-spam : éviter d'envoyer trop de codes
    if (user.otpExpires && user.otpExpires > new Date(Date.now() - 2 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'Un code a déjà été envoyé récemment. Attends 2 minutes.' 
      });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes (aligné avec email.service)
    user.otpChannel = 'email';
    user.lastVerificationSent = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Envoi email
    await sendVerificationEmail(user.email, code);
    
    console.log(`📧 [VERIFY EMAIL] ${user.email} → code: ${code}`);
    
    res.json({
      message: 'Code de vérification envoyé par email.',
      expiresIn: 600, // 10 minutes en secondes
      ...(process.env.NODE_ENV !== 'production' && { code }),
    });
  } catch (err) { 
    console.error('❌ [SEND_VERIFICATION] Erreur:', err);
    next(err); 
  }
});

router.post('/verify-email', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;
    
    // Validation du code
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Code invalide. Format à 6 chiffres requis.' });
    }
    
    const user = await User.findById(req.user._id).select('+otp +otpExpires');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }
    
    if (!user.otp || user.otp !== code) {
      return res.status(400).json({ error: 'Code incorrect' });
    }
    
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'Code expiré. Demandes-en un nouveau.' });
    }
    
    // Marquer l'email comme vérifié
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save({ validateBeforeSave: false });
    
    console.log(`✅ [VERIFY_EMAIL] Utilisateur ${user._id} a vérifié son email: ${user.email}`);
    
    res.json({ 
      message: 'Email vérifié avec succès ✅', 
      verified: true,
    });
  } catch (err) { 
    console.error('❌ [VERIFY_EMAIL] Erreur:', err);
    next(err); 
  }
});

// ─── Renvoyer le code de vérification ─────────────────────────────────────────
router.post('/resend-verification', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.email) {
      return res.status(400).json({ error: 'Pas d\'email associé à ce compte' });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }
    
    // Anti-spam : 1 minute minimum entre deux envois
    const lastAttempt = user.lastVerificationSent;
    if (lastAttempt && (Date.now() - new Date(lastAttempt).getTime()) < 60 * 1000) {
      return res.status(429).json({ 
        error: 'Veuillez attendre 1 minute avant de renvoyer un code.' 
      });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = code;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpChannel = 'email';
    user.lastVerificationSent = new Date();
    await user.save({ validateBeforeSave: false });
    
    await sendVerificationEmail(user.email, code);
    
    console.log(`📧 [RESEND VERIFICATION] ${user.email} → code: ${code}`);
    
    res.json({
      message: 'Nouveau code envoyé par email.',
      expiresIn: 600,
      ...(process.env.NODE_ENV !== 'production' && { code }),
    });
  } catch (err) {
    console.error('❌ [RESEND_VERIFICATION] Erreur:', err);
    next(err);
  }
});

module.exports = router;