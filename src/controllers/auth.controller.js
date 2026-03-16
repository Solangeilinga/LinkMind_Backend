const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const { AppError } = require('../middleware/errorHandler');

// Normalise un numéro : supprime espaces, tirets, points
const normalizePhone = (p) => p ? p.replace(/[\s\-\.]/g, '') : p;

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

// Sérialise un user pour la réponse API
const serializeUser = (user) => ({
  id: user._id,
  name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
  firstName: user.firstName || null,
  lastName:  user.lastName  || null,
  email:     user.email     || null,
  phone:     user.phone     || null,
  age:       user.age       || null,
  city:      user.city      || null,
  gender:    user.gender    || null,
  avatar:    user.avatar,
  anonymousAlias: user.anonymousAlias || null,
  totalPoints: user.totalPoints,
  level:       user.level,
  streakDays:  user.streakDays,
  isPremium:   user.isPremium,
  preferences: user.preferences,
});

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('REGISTER body:', JSON.stringify(req.body));
      console.log('VALIDATION errors:', JSON.stringify(errors.array()));
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { firstName, lastName, email, phone, age, city, gender,
            password, anonymousAlias } = req.body;

    // Build full name
    const name = `${firstName || ''} ${lastName || ''}`.trim() || null;

    // Normaliser le numéro
    if (phone) req.body.phone = normalizePhone(phone);
    const phoneNorm = req.body.phone;

    // Require at least phone or email
    if (!phone && !email) {
      return res.status(400).json({ error: 'Un email ou un numéro de téléphone est requis.' });
    }

    // Check email uniqueness if provided
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(409).json({ error: 'Ce numéro est déjà utilisé.' });
    }

    // Vérifier unicité du pseudo anonyme
    if (anonymousAlias && anonymousAlias.trim()) {
      const existingAlias = await User.findOne({ anonymousAlias: anonymousAlias.trim() });
      if (existingAlias) {
        return res.status(409).json({ error: 'Ce pseudo est déjà pris. Choisis-en un autre.' });
      }
    }

    const user = await User.create({
      name,
      firstName: firstName?.trim() || null,
      lastName:  lastName?.trim()  || null,
      email:     email?.trim().toLowerCase() || null,
      phone:     phone ? phone.replace(/[\s\-\.]/g, '') : null,
      age:       age  || null,
      city:      city?.trim()   || null,
      gender:    gender         || null,
      password,
      anonymousAlias: anonymousAlias?.trim() || null,
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ error: 'Email ou téléphone et mot de passe requis' });
    }

    const query = email ? { email: email.toLowerCase() } : { phone: normalizePhone(phone) };
    const user = await User.findOne(query).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    user.updateStreak();
    await user.save({ validateBeforeSave: false });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json(tokens);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired, please login again' });
    }
    next(error);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save({ validateBeforeSave: false });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Helper: générer un OTP à 6 chiffres ──────────────────────────────────────
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Helper: envoyer l'OTP (email ou SMS) ─────────────────────────────────────
const sendOtp = async (channel, destination, otp) => {
  if (channel === 'email') {
    // TODO: brancher nodemailer / SendGrid
    // await transporter.sendMail({ to: destination, subject: 'Ton code LinkMind', text: `Code: ${otp}` });
    console.log(`[OTP EMAIL] → ${destination} : ${otp}`);
  } else {
    // TODO: brancher Africa's Talking / Twilio
    // await smsClient.messages.create({ to: destination, body: `Ton code LinkMind: ${otp}` });
    console.log(`[OTP SMS] → ${destination} : ${otp}`);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { identifier } = req.body;
    const isEmail = identifier.includes('@');

    // Chercher l'utilisateur par email ou téléphone
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };
    const user = await User.findOne(query).select('+otp +otpExpires +otpChannel');
    if (!user) return res.status(404).json({ error: 'Aucun compte trouvé avec cet identifiant.' });

    // Générer OTP valable 15 minutes
    const otp = generateOtp();
    user.otp        = otp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.otpChannel = isEmail ? 'email' : 'sms';
    await user.save({ validateBeforeSave: false });

    await sendOtp(user.otpChannel, identifier, otp);

    res.json({
      message: `Code envoyé par ${isEmail ? 'email' : 'SMS'}.`,
      channel: user.otpChannel,
      // En dev uniquement — retirer en production
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (err) { next(err); }
};

// POST /api/auth/verify-otp
exports.verifyOtp = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    const isEmail = identifier.includes('@');
    const query   = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    const user = await User.findOne(query).select('+otp +otpExpires');
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
    if (!user.otp || user.otp !== otp) return res.status(400).json({ error: 'Code incorrect.' });
    if (user.otpExpires < new Date()) return res.status(400).json({ error: 'Code expiré. Demande-en un nouveau.' });

    res.json({ message: 'Code valide.', valid: true });
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { identifier, otp, newPassword } = req.body;
    const isEmail = identifier.includes('@');
    const query   = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    const user = await User.findOne(query).select('+otp +otpExpires');
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
    if (!user.otp || user.otp !== otp) return res.status(400).json({ error: 'Code incorrect.' });
    if (user.otpExpires < new Date()) return res.status(400).json({ error: 'Code expiré.' });

    user.password   = newPassword;
    user.otp        = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) { next(err); }
};