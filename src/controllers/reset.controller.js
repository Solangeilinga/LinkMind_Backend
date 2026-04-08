const crypto = require('crypto');
const normalizePhone = (p) => p ? p.replace(/[\s\-\.]/g, '') : p;
const User = require('../models/user.model');
const { sendSMS, sendPasswordReset } = require('../services/sms.service');
const { sendPasswordResetEmail } = require('../services/email.service');

// ✅ Modèle OTP MongoDB (à créer)
const Otp = require('../models/otp.model');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    let { phone, email } = req.body;
    if (phone) phone = normalizePhone(phone);
    if (!phone && !email) {
      return res.status(400).json({ error: 'Email ou téléphone requis' });
    }

    const query = phone ? { phone: normalizePhone(phone) } : { email: email.toLowerCase() };
    const user = await User.findOne(query);

    // Ne pas révéler si le compte existe (sécurité)
    if (!user) {
      return res.json({ message: 'Si ce compte existe, un code a été envoyé.' });
    }

    const code = generateOTP();
    const key = phone || email.toLowerCase();

    // ✅ Supprimer l'ancien OTP s'il existe
    await Otp.deleteOne({ key });

    // ✅ Créer le nouvel OTP dans MongoDB
    await Otp.create({
      key,
      code,
      userId: user._id,
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    });

    console.log(`[OTP] ${key} → Code: ${code}`);

    if (phone) {
      await sendPasswordReset(phone, code);
    } else {
      await sendPasswordResetEmail(email, code);
    }

    res.json({ message: 'Si ce compte existe, un code a été envoyé.' });
  } catch (err) { next(err); }
};

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, email, code } = req.body;
    if (!code || (!phone && !email)) {
      return res.status(400).json({ error: 'Code et identifiant requis' });
    }

    const key = phone || email?.toLowerCase();
    
    // ✅ Chercher l'OTP dans MongoDB
    const otpEntry = await Otp.findOne({ key, code, expiresAt: { $gt: new Date() } });

    if (!otpEntry) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    // Générer un token temporaire pour la réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');

    // ✅ Stocker le token de réinitialisation dans MongoDB
    await Otp.create({
      key: `reset:${resetToken}`,
      userId: otpEntry.userId,
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    });

    // Supprimer l'OTP utilisé
    await Otp.deleteOne({ _id: otpEntry._id });

    res.json({ resetToken });
  } catch (err) { next(err); }
};

// ─── POST /auth/reset-password ────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    // ✅ Chercher le token dans MongoDB
    const tokenEntry = await Otp.findOne({ 
      key: `reset:${resetToken}`, 
      expiresAt: { $gt: new Date() } 
    });

    if (!tokenEntry) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const user = await User.findById(tokenEntry.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    user.password = newPassword;
    await user.save();

    // ✅ Supprimer le token utilisé
    await Otp.deleteOne({ _id: tokenEntry._id });

    // ✅ Supprimer tous les OTP expirés (nettoyage)
    await Otp.deleteMany({ expiresAt: { $lt: new Date() } });

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) { next(err); }
};

// ─── Nettoyage automatique des OTP expirés ────────────────────────────────────
// Index TTL MongoDB gère automatiquement, mais on garde une sécurité
setInterval(async () => {
  try {
    await Otp.deleteMany({ expiresAt: { $lt: new Date() } });
    console.log('🧹 [OTP] Nettoyage des codes expirés effectué');
  } catch (err) {
    console.error('❌ [OTP] Erreur nettoyage:', err.message);
  }
}, 60 * 60 * 1000); // Toutes les heures