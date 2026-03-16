const crypto  = require('crypto');
const normalizePhone = (p) => p ? p.replace(/[\s\-\.]/g, '') : p;
const User    = require('../models/user.model');
const { sendSMS, sendPasswordReset } = require('../services/sms.service');
const { sendPasswordResetEmail } = require('../services/email.service');

// OTP en mémoire (clé: phone/email, valeur: {code, expiresAt})
// En production, utiliser Redis
const otpStore = new Map();

const generateOTP  = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_TTL_MS   = 10 * 60 * 1000; // 10 minutes

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
// Body: { phone } ou { email }
exports.forgotPassword = async (req, res, next) => {
  try {
    let { phone, email } = req.body;
    if (phone) phone = normalizePhone(phone);
    if (!phone && !email) {
      return res.status(400).json({ error: 'Email ou téléphone requis' });
    }

    const query = phone ? { phone: normalizePhone(phone) } : { email: email.toLowerCase() };
    const user  = await User.findOne(query);

    // On ne révèle pas si le compte existe (sécurité)
    if (!user) {
      return res.json({ message: 'Si ce compte existe, un code a été envoyé.' });
    }

    const code      = generateOTP();
    const expiresAt = Date.now() + OTP_TTL_MS;
    const key       = phone || email.toLowerCase();
    otpStore.set(key, { code, expiresAt, userId: user._id.toString() });

    // Log toujours en dev pour tester
    console.log(`[OTP] ${phone || email} → Code: ${code}`);

    if (phone) {
      await sendPasswordReset(phone, code);
    } else {
      await sendPasswordResetEmail(email, code);
    }

    res.json({ message: 'Si ce compte existe, un code a été envoyé.' });
  } catch (err) { next(err); }
};

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
// Body: { phone ou email, code }
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, email, code } = req.body;
    if (!code || (!phone && !email)) {
      return res.status(400).json({ error: 'Code et identifiant requis' });
    }

    const key   = phone || (email?.toLowerCase());
    const entry = otpStore.get(key);

    if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    // Générer un token temporaire pour la réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    otpStore.set(`reset:${resetToken}`, { userId: entry.userId, expiresAt: Date.now() + OTP_TTL_MS });
    otpStore.delete(key);

    res.json({ resetToken });
  } catch (err) { next(err); }
};

// ─── POST /auth/reset-password ────────────────────────────────────────────────
// Body: { resetToken, newPassword }
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const entry = otpStore.get(`reset:${resetToken}`);
    if (!entry || Date.now() > entry.expiresAt) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const user = await User.findById(entry.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    user.password = newPassword;
    await user.save();
    otpStore.delete(`reset:${resetToken}`);

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) { next(err); }
};