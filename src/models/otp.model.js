const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index: MongoDB supprime automatiquement
  },
}, { timestamps: true });

// Index TTL pour suppression automatique
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);