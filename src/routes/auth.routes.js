// auth.routes.js
const express = require('express');
const router = express.Router();
const authController  = require('../controllers/auth.controller');
const resetController = require('../controllers/reset.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('Le prénom est requis'),
  body('lastName').trim().notEmpty().withMessage('Le nom est requis'),
  body('email').optional({ nullable: true, checkFalsy: true })
    .isEmail().normalizeEmail().withMessage('Format email invalide'),
  body('phone').optional({ nullable: true, checkFalsy: true })
    .matches(/^(\+?\d{6,15})$/).withMessage('Format téléphone invalide (chiffres uniquement, 6-15 caractères)'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères'),
], authController.register);

router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.patch('/change-password', authenticate, authController.changePassword);

// ─── Reset password (OTP flow) ────────────────────────────────────────────────
router.post('/forgot-password', resetController.forgotPassword);
router.post('/verify-otp',      resetController.verifyOtp);
router.post('/reset-password',  resetController.resetPassword);

module.exports = router;