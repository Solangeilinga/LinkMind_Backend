const mongoose = require('mongoose');

const assistantSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  history: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });

// Index TTL pour nettoyer les sessions inactives après 7 jours
assistantSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('AssistantSession', assistantSessionSchema);