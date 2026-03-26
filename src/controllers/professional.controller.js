const Professional = require('../models/professional.model');
const Booking      = require('../models/booking.model');
const User         = require('../models/user.model');
const { sendEmail } = require('../services/email.service');
const mongoose = require('mongoose');

const { ProfessionalType } = require('../models/content.model');

// Cache en mémoire pour éviter les appels DB répétés
let _typeLabelsCache = null;
let _typeLabelsCacheTime = 0;

const getTypeLabels = async () => {
  const now = Date.now();
  // Rafraîchit le cache toutes les 5 minutes
  if (_typeLabelsCache && now - _typeLabelsCacheTime < 5 * 60 * 1000) {
    return _typeLabelsCache;
  }
  const types = await ProfessionalType.find({ isActive: true });
  _typeLabelsCache = types.reduce((acc, t) => { acc[t.id] = t.label; return acc; }, {
    psychologist: 'Psychologue', coach: 'Coach bien-être', doctor: 'Médecin', // fallback
  });
  _typeLabelsCacheTime = now;
  return _typeLabelsCache;
};

// ─── GET /api/professionals ───────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { type, city, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (type)   filter.type = type;
    if (city)   filter.city = new RegExp(city, 'i');
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [
        { firstName: re }, { lastName: re },
        { bio: re }, { specialties: re },
      ];
    }

    const pros = await Professional.find(filter)
      .sort({ isVerified: -1, rating: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-commissionRate');

    const total = await Professional.countDocuments(filter);

    const TYPE_LABELS = await getTypeLabels();
    const formattedPros = pros.map(p => {
      const proObj = p.toObject();
      return {
        ...proObj,
        id:        proObj._id,
        fullName:  `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        typeLabel: TYPE_LABELS[p.type] || p.type,
      };
    });

    res.json({ professionals: formattedPros, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ─── GET /api/professionals/:id ───────────────────────────────────────────────
exports.detail = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID professionnel invalide' });
    }

    const pro = await Professional.findOne({ _id: req.params.id, isActive: true })
      .select('-commissionRate');

    if (!pro) return res.status(404).json({ error: 'Professionnel introuvable' });

    const TYPE_LABELS = await getTypeLabels();
    const proObj = pro.toObject();
    res.json({ professional: {
      ...proObj,
      id:        proObj._id,
      fullName:  `${pro.firstName || ''} ${pro.lastName || ''}`.trim(),
      typeLabel: TYPE_LABELS[pro.type] || pro.type,
    }});
  } catch (err) { next(err); }
};

// ─── POST /api/professionals/:id/book ─────────────────────────────────────────
exports.book = async (req, res, next) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'Utilisateur non authentifié' });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID professionnel invalide' });
    }

    const { sessionType, preferredDate, reason, isAnonymous = true } = req.body;

    const pro = await Professional.findOne({
      _id: req.params.id,
      isActive: true,
      $or: [{ isOnline: true }, { isInPerson: true }],
    });

    if (!pro) {
      const exists = await Professional.findById(req.params.id);
      if (exists && !exists.isActive) return res.status(404).json({ error: 'Compte professionnel désactivé' });
      if (exists && !exists.isOnline && !exists.isInPerson) return res.status(404).json({ error: 'Professionnel non disponible' });
      return res.status(404).json({ error: 'Professionnel introuvable' });
    }

    if (sessionType === 'online' && !pro.isOnline) {
      return res.status(400).json({ error: "Ce professionnel ne propose pas de consultation en ligne" });
    }
    if (sessionType === 'in_person' && !pro.isInPerson) {
      return res.status(400).json({ error: "Ce professionnel ne propose pas de consultation en présentiel" });
    }

    // Vérifier doublon
    const existing = await Booking.findOne({ user: req.user._id, professional: pro._id, status: 'pending' });
    if (existing) return res.status(409).json({ error: 'Tu as déjà une demande en attente avec ce professionnel.' });

    const booking = await Booking.create({
      user: req.user._id,
      professional: pro._id,
      sessionType: sessionType || 'online',
      preferredDate,
      reason,
      isAnonymous,
      sessionPrice:     pro.sessionPrice,
      commissionRate:   pro.commissionRate,
      commissionAmount: Math.round((pro.sessionPrice || 0) * (pro.commissionRate || 10) / 100),
      status: 'pending',
    });

    res.status(201).json({
      message: "Demande envoyée. L'équipe LinkMind va la valider et le professionnel sera contacté.",
      booking: { _id: booking._id, id: booking._id, status: booking.status, createdAt: booking.createdAt },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/professionals/bookings/me ──────────────────────────────────────
exports.myBookings = async (req, res, next) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'Utilisateur non authentifié' });

    const bookings = await Booking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('professional', 'firstName lastName title type photo city isOnline isInPerson sessionPrice currency');

    const formattedBookings = bookings.map(b => {
      const obj = b.toObject();
      if (obj.professional) {
        obj.professional.fullName = `${obj.professional.firstName || ''} ${obj.professional.lastName || ''}`.trim();
        obj.professional.id = obj.professional._id;
      }
      obj.id = obj._id;
      return obj;
    });

    res.json({ bookings: formattedBookings });
  } catch (err) { next(err); }
};

// ─── POST /api/professionals/bookings/:id/confirm (admin) ────────────────────
exports.confirmBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'ID de réservation invalide' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('professional')
      .populate('user', 'firstName lastName email phone anonymousAlias');

    if (!booking) return res.status(404).json({ error: 'Réservation introuvable' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Cette demande a déjà été traitée' });

    booking.status      = 'confirmed';
    booking.confirmedAt = new Date();
    if (req.body.adminNote) booking.adminNote = req.body.adminNote;
    await booking.save();

    await Professional.findByIdAndUpdate(booking.professional._id, { $inc: { totalBookings: 1 } });

    const pro = booking.professional;

    // Email au pro — identité masquée si anonyme
    if (pro.email && process.env.SMTP_USER) {
      const userInfo = booking.isAnonymous
        ? '<b>Identité :</b> Anonyme (protégée par LinkMind)'
        : `<b>Contact :</b> ${booking.user.firstName || ''} ${booking.user.lastName || ''} — ${booking.user.phone || booking.user.email || 'via LinkMind'}`;

      await sendEmail({
        to: pro.email,
        subject: 'LinkMind — Demande de consultation confirmée',
        html: `<p>Bonjour ${pro.firstName},</p>
          <p>Une demande de consultation a été validée par LinkMind.</p>
          <ul>
            <li><b>Type :</b> ${booking.sessionType === 'online' ? 'En ligne' : 'En personne'}</li>
            <li><b>Disponibilité :</b> ${booking.preferredDate || 'Non précisé'}</li>
            <li><b>Motif :</b> ${booking.reason || 'Non précisé'}</li>
            <li>${userInfo}</li>
          </ul>
          <p><small>LinkMind protège ses utilisateurs. Ne demande jamais leurs coordonnées personnelles.</small></p>`,
      }).catch(err => console.error('[Email pro]', err.message));
    }

    // Email à l'user
    if (booking.user?.email && process.env.SMTP_USER) {
      await sendEmail({
        to: booking.user.email,
        subject: 'LinkMind — Ta demande a été transmise',
        html: `<p>Bonjour,</p>
          <p>Ta demande de consultation auprès de <b>${pro.title || ''} ${pro.firstName} ${pro.lastName}</b> a été validée.</p>
          <p>Le professionnel va te contacter prochainement.</p>
          <p><small>Ton identité ${booking.isAnonymous ? "n'a pas été communiquée" : 'a été partagée avec le professionnel'}.</small></p>`,
      }).catch(() => {});
    }

    res.json({ message: 'Demande confirmée et transmise au professionnel.' });
  } catch (err) { next(err); }
};

// ─── POST /api/professionals/bookings/:id/cancel (admin) ─────────────────────
exports.cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'ID de réservation invalide' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('user', 'email firstName');

    if (!booking) return res.status(404).json({ error: 'Réservation introuvable' });

    booking.status    = 'cancelled';
    booking.adminNote = req.body.reason || 'Annulée par administration';
    await booking.save();

    if (booking.user?.email && process.env.SMTP_USER) {
      await sendEmail({
        to: booking.user.email,
        subject: "LinkMind — Ta demande n'a pas pu être traitée",
        html: `<p>Bonjour,</p>
          <p>Ta demande de consultation n'a malheureusement pas pu être traitée.</p>
          <p>Tu peux soumettre une nouvelle demande ou contacter le support.</p>`,
      }).catch(() => {});
    }

    res.json({ message: 'Demande annulée.' });
  } catch (err) { next(err); }
};

// ─── GET /api/professionals/bookings/all (admin) ──────────────────────────────
exports.allBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('professional', 'firstName lastName title type city')
      .populate('user', 'anonymousAlias city age firstName lastName');

    const sanitized = bookings.map(b => {
      const obj = b.toObject();
      obj.id = obj._id;
      if (obj.professional) {
        obj.professional.id = obj.professional._id;
        obj.professional.fullName = `${obj.professional.firstName || ''} ${obj.professional.lastName || ''}`.trim();
      }
      obj.user = obj.isAnonymous
        ? { displayName: obj.user?.anonymousAlias || '👤 Anonyme', city: obj.user?.city, age: obj.user?.age, id: obj.user?._id }
        : { displayName: `${obj.user?.firstName || ''} ${obj.user?.lastName || ''}`.trim(), city: obj.user?.city, age: obj.user?.age, id: obj.user?._id };
      return obj;
    });

    const total = await Booking.countDocuments(filter);
    res.json({ bookings: sanitized, total, page: parseInt(page) });
  } catch (err) { next(err); }
};