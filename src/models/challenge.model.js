const mongoose = require('mongoose');

// ─── Master challenge definition ─────────────────────────────────────────────
const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: [{ type: String }], // Step-by-step instructions
  
  // Category (référence vers ChallengeCategory)
  category: { type: String, ref: 'ChallengeCategory', required: true },
  
  // Difficulty (référence vers ChallengeDifficulty)
  difficulty: { type: String, ref: 'ChallengeDifficulty', default: 'easy' },
  
  // Durée en minutes
  durationMinutes: { type: Number, required: true },
  
  // Points gagnés
  points: { type: Number, required: true },
  
  // Icône du défi
  icon: { type: String, required: true },
  
  // Type de complétion (timer, action, reflection, social, exploration)
  completionType: {
    type: {
      type: String,
      enum: ['timer', 'action', 'reflection', 'social', 'exploration'],
      required: true,
      default: 'action'
    },
    config: {
      // Pour timer
      stepDuration: { type: Number, default: null },      // secondes par étape
      totalDuration: { type: Number, default: null },     // secondes totales
      stepsCount: { type: Number, default: null },        // nombre d'étapes
      
      // Pour reflection
      requiresInput: { type: Boolean, default: false },
      minWords: { type: Number, default: null },
      inputPlaceholder: { type: String, default: null },
      
      // Pour action/social/exploration
      validationEndpoint: { type: String, default: null },
      targetScreen: { type: String, default: null },
      requiresInteraction: { type: Boolean, default: false },
      checkUserAction: { type: Boolean, default: false },
      targetType: { type: String, default: null },        // 'comment', 'reaction', 'post'
    }
  },
  
  // Moods ciblés par ce défi (pour personnalisation)
  targetMoods: [{
    type: String,
    enum: ['great', 'good', 'neutral', 'tired', 'stressed', 'anxious', 'sad'],
  }],
  
  // Niveau requis pour voir ce défi
  requiredLevel: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'all'],
    default: 'all',
  },
  
  // Défi premium
  isPremium: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // Ordre d'affichage
  order: { type: Number, default: 0 },
  
  // Pour les mini-jeux: config spécifique
  gameConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  
}, { timestamps: true });

// ─── User challenge completion log ───────────────────────────────────────────
const challengeCompletionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  completedAt: { type: Date, default: Date.now },
  date: { type: String, required: true }, // YYYY-MM-DD
  pointsEarned: { type: Number, required: true },
  durationSeconds: { type: Number, default: null }, // temps réel passé
  reflection: { type: String, default: null },      // pour les défis de réflexion
  mood: { type: mongoose.Schema.Types.ObjectId, ref: 'Mood', default: null },
  feedback: {
    helpful: { type: Boolean, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: null },
  },
}, { timestamps: true });

// Index unique: une complétion par défi par utilisateur par jour
challengeCompletionSchema.index({ user: 1, challenge: 1, date: 1 }, { unique: true });

const Challenge = mongoose.model('Challenge', challengeSchema);
const ChallengeCompletion = mongoose.model('ChallengeCompletion', challengeCompletionSchema);

module.exports = { Challenge, ChallengeCompletion };