const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  // Contenu
  title:       { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 120 },
  imageUrl:    { type: String, default: null },
  emoji:       { type: String, default: '🌿' },
  ctaLabel:    { type: String, default: 'En savoir plus', maxlength: 30 },
  ctaUrl:      { type: String, default: null }, // lien externe

  // Catégorie (bien-être uniquement)
  category: {
    type: String,
    enum: ['prevention', 'wellness', 'local_product', 'event', 'service'],
    default: 'wellness',
  },

  // Ciblage
  targetAgeMin: { type: Number, default: null },
  targetAgeMax: { type: Number, default: null },
  targetCity:   { type: String, default: null },

  // Placement
  placement: [{
    type: String,
    enum: ['community_feed', 'mood_screen', 'challenges_screen'],
  }],

  // Stats
  impressions: { type: Number, default: 0 },
  clicks:      { type: Number, default: 0 },

  // Admin
  advertiser:  { type: String, trim: true }, // nom de l'annonceur
  isActive:    { type: Boolean, default: true },
  startsAt:    { type: Date, default: null },
  endsAt:      { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);