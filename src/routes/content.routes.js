const express = require('express');
const router  = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { Badge, StressFactor, DailyMessage, WellnessTip, MoodDefinition, ProfessionalType, ChallengeCategory, ChallengeDifficulty, PostType } = require('../models/content.model');

router.use(authenticate);

// ─── Badges ───────────────────────────────────────────────────────────────────
router.get('/badges', async (req, res, next) => {
  try {
    const badges = await Badge.find({ isActive: true }).sort({ order: 1 });
    res.json({ badges });
  } catch (err) { next(err); }
});

// ─── Stress factors ───────────────────────────────────────────────────────────
router.get('/stress-factors', async (req, res, next) => {
  try {
    const factors = await StressFactor.find({ isActive: true }).sort({ order: 1 });
    res.json({ factors });
  } catch (err) { next(err); }
});

// ─── Daily message (1 aléatoire ou selon index du jour) ──────────────────────
router.get('/daily-message', async (req, res, next) => {
  try {
    const count = await DailyMessage.countDocuments({ isActive: true });
    if (count === 0) return res.json({ message: null });
    const dayIndex = Math.floor(Date.now() / 86400000) % count;
    const messages = await DailyMessage.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ message: messages[dayIndex] || messages[0] });
  } catch (err) { next(err); }
});

// ─── Wellness tips (par humeur) ───────────────────────────────────────────────
router.get('/wellness-tips', async (req, res, next) => {
  try {
    const { mood } = req.query;
    const filter = { isActive: true };
    if (mood) filter.moodId = mood;
    const tips = await WellnessTip.find(filter).sort({ moodId: 1, order: 1 });

    // Grouper par humeur pour le frontend
    const grouped = tips.reduce((acc, tip) => {
      if (!acc[tip.moodId]) acc[tip.moodId] = [];
      acc[tip.moodId].push(tip);
      return acc;
    }, {});

    res.json(mood ? { tips } : { tips: grouped });
  } catch (err) { next(err); }
});

// ─── Admin CRUD badges ────────────────────────────────────────────────────────
router.post('/badges',       requireAdmin, async (req, res, next) => {
  try { res.status(201).json({ badge: await Badge.create(req.body) }); } catch (err) { next(err); }
});
router.patch('/badges/:id',  requireAdmin, async (req, res, next) => {
  try { res.json({ badge: await Badge.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (err) { next(err); }
});
router.delete('/badges/:id', requireAdmin, async (req, res, next) => {
  try { await Badge.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (err) { next(err); }
});

// ─── Admin CRUD daily messages ────────────────────────────────────────────────
router.post('/daily-messages',       requireAdmin, async (req, res, next) => {
  try { res.status(201).json({ message: await DailyMessage.create(req.body) }); } catch (err) { next(err); }
});
router.patch('/daily-messages/:id',  requireAdmin, async (req, res, next) => {
  try { res.json({ message: await DailyMessage.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (err) { next(err); }
});
router.delete('/daily-messages/:id', requireAdmin, async (req, res, next) => {
  try { await DailyMessage.findByIdAndDelete(req.params.id); res.json({ ok: true }); } catch (err) { next(err); }
});

// ─── Mood definitions ─────────────────────────────────────────────────────────
router.get('/moods', async (req, res, next) => {
  try {
    const moods = await MoodDefinition.find({ isActive: true }).sort({ order: 1 });
    res.json({ moods });
  } catch (err) { next(err); }
});

router.patch('/moods/:id', requireAdmin, async (req, res, next) => {
  try {
    const mood = await MoodDefinition.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json({ mood });
  } catch (err) { next(err); }
});

// ─── Professional types ───────────────────────────────────────────────────────
router.get('/professional-types', async (req, res, next) => {
  try {
    const types = await ProfessionalType.find({ isActive: true }).sort({ order: 1 });
    res.json({ types });
  } catch (err) { next(err); }
});

router.patch('/professional-types/:id', requireAdmin, async (req, res, next) => {
  try {
    const type = await ProfessionalType.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json({ type });
  } catch (err) { next(err); }
});

// ─── Assistant starters ───────────────────────────────────────────────────────
router.get('/assistant-starters', async (req, res, next) => {
  try {
    const { AssistantStarter } = require('../models/config.model');
    const starters = await AssistantStarter.find({ isActive: true }).sort({ order: 1 });
    res.json({ starters });
  } catch (err) { next(err); }
});

// ─── App config (public keys) ─────────────────────────────────────────────────
router.get('/app-config', async (req, res, next) => {
  try {
    const AppConfig = require('../models/app-config.model');
    const config = await AppConfig.getMany([
      'mindo_daily_limit', 'premium_price_monthly',
      'premium_price_yearly', 'ad_frequency', 'app_name',
    ]);
    res.json({ config });
  } catch (err) { next(err); }
});

// ─── Challenge categories ──────────────────────────────────────────────────────
router.get('/challenge-categories', async (req, res, next) => {
  try {
    const cats = await ChallengeCategory.find({ isActive: true }).sort({ order: 1 });
    res.json({ categories: cats });
  } catch (err) { next(err); }
});

// ─── Challenge difficulties ────────────────────────────────────────────────────
router.get('/challenge-difficulties', async (req, res, next) => {
  try {
    const diffs = await ChallengeDifficulty.find({ isActive: true }).sort({ order: 1 });
    res.json({ difficulties: diffs });
  } catch (err) { next(err); }
});

// ─── Post types ────────────────────────────────────────────────────────────────
router.get('/post-types', async (req, res, next) => {
  try {
    const types = await PostType.find({ isActive: true }).sort({ order: 1 });
    res.json({ types });
  } catch (err) { next(err); }
});

// ─── Admin: update app config ─────────────────────────────────────────────────
router.patch('/app-config/:key', requireAdmin, async (req, res, next) => {
  try {
    const AppConfig = require('../models/app-config.model');
    const doc = await AppConfig.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value },
      { new: true }
    );
    res.json({ config: doc });
  } catch (err) { next(err); }
});

// ─── Languages ────────────────────────────────────────────────────────────────
const { Language } = require('../models/content.model');

// GET /api/content/languages — liste des langues actives (public)
router.get('/languages', async (req, res, next) => {
  try {
    const languages = await Language.find({ isActive: true })
      .sort({ order: 1 })
      .select('code label nativeLabel flag isRTL order');
    res.json({ languages });
  } catch (err) { next(err); }
});

// Admin CRUD langues
router.post('/languages', requireAdmin, async (req, res, next) => {
  try {
    const language = await Language.create(req.body);
    res.status(201).json({ language });
  } catch (err) { next(err); }
});

router.patch('/languages/:id', requireAdmin, async (req, res, next) => {
  try {
    const language = await Language.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!language) return res.status(404).json({ error: 'Langue introuvable' });
    res.json({ language });
  } catch (err) { next(err); }
});

router.delete('/languages/:id', requireAdmin, async (req, res, next) => {
  try {
    await Language.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;