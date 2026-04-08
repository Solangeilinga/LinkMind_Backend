const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  type: {
    type: String,
    enum: [
      'comment',        // quelqu'un a commenté ton post
      'reply',          // quelqu'un a répondu à ton commentaire
      'reaction',       // quelqu'un a réagi à ton post
      'same_feeling',   // quelqu'un a cliqué "Moi aussi" sur ton post
      'badge',          // tu as gagné un badge communauté
    ],
    required: true,
  },

  // Référence vers le contenu concerné
  postId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Post',    default: null },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },

  // Message affiché dans l'UI
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  emoji:   { type: String, default: '🔔' },

  // Données supplémentaires (badge, type de réaction, etc.)
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },

  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Index pour les requêtes fréquentes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);