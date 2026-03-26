const Ad   = require('../models/ad.model');
const User = require('../models/user.model');

// ─── GET /api/ads?placement=community_feed ────────────────────────────────────
// Retourne 1 pub aléatoire active pour ce placement (freemium uniquement)
exports.getAd = async (req, res, next) => {
  try {
    const { placement = 'community_feed' } = req.query;

    // Premium = pas de pub
    if (req.user.isPremium) {
      return res.json({ ad: null, isPremium: true });
    }

    const now = new Date();
    const filter = {
      isActive:  true,
      placement: placement,
      $or: [
        { startsAt: null },
        { startsAt: { $lte: now } },
      ],
      $and: [
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    };

    // Ciblage par âge si disponible
    const user = req.user;
    if (user.age) {
      filter.$or = [
        { targetAgeMin: null },
        { targetAgeMin: { $lte: user.age } },
      ];
    }

    const count = await Ad.countDocuments(filter);
    if (count === 0) return res.json({ ad: null });

    // Pub aléatoire
    const skip = Math.floor(Math.random() * count);
    const ad   = await Ad.findOne(filter).skip(skip)
      .select('-advertiser -impressions -clicks -targetAgeMin -targetAgeMax');

    if (!ad) return res.json({ ad: null });

    // Incrémenter impressions
    await Ad.findByIdAndUpdate(ad._id, { $inc: { impressions: 1 } });

    res.json({ ad, isPremium: false });
  } catch (err) { next(err); }
};

// ─── POST /api/ads/:id/click ──────────────────────────────────────────────────
exports.trackClick = async (req, res, next) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────
exports.createAd = async (req, res, next) => {
  try {
    const ad = await Ad.create(req.body);
    res.status(201).json({ ad });
  } catch (err) { next(err); }
};

exports.listAds = async (req, res, next) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json({ ads });
  } catch (err) { next(err); }
};

exports.updateAd = async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ ad });
  } catch (err) { next(err); }
};

exports.deleteAd = async (req, res, next) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supprimée' });
  } catch (err) { next(err); }
};