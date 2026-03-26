require('dotenv').config();
const mongoose = require('mongoose');
const Ad = require('../models/ad.model');

const ads = [
  {
    title: 'Tisane Bien-être Naturelle 🌿',
    description: 'Infusions bio locales pour réduire le stress. Livraison à Ouagadougou.',
    emoji: '🍵',
    ctaLabel: 'Découvrir',
    ctaUrl: 'https://example.com',
    category: 'local_product',
    placement: ['community_feed', 'mood_screen'],
    advertiser: 'HerboNatura BF',
    isActive: true,
  },
  {
    title: 'Journée Santé Mentale — Gratuit',
    description: 'Atelier bien-être gratuit à Ouagadougou. Samedi 22 mars.',
    emoji: '🎪',
    ctaLabel: 'S\'inscrire',
    ctaUrl: 'https://example.com',
    category: 'event',
    placement: ['community_feed', 'challenges_screen'],
    advertiser: 'Association Jeunesse+',
    isActive: true,
  },
  {
    title: 'Huile de Karité Pure 🌰',
    description: 'Cosmétique naturel burkinabè. Hydratation et bien-être au quotidien.',
    emoji: '✨',
    ctaLabel: 'Commander',
    ctaUrl: 'https://example.com',
    category: 'local_product',
    placement: ['mood_screen'],
    advertiser: 'Karité du Sahel',
    isActive: true,
  },
  {
    title: 'Prévention Burn-out Étudiant',
    description: 'Tu te sens épuisé(e) ? Des ressources gratuites pour toi.',
    emoji: '💙',
    ctaLabel: 'Accéder',
    ctaUrl: 'https://example.com',
    category: 'prevention',
    placement: ['community_feed', 'mood_screen', 'challenges_screen'],
    advertiser: 'Ministère de la Santé',
    isActive: true,
  },
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/linkmind')
  .then(async () => {
    await Ad.deleteMany({});
    await Ad.insertMany(ads);
    console.log(`✅ ${ads.length} publicités ajoutées`);
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });