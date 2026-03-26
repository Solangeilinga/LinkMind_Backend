const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },

  // Détails de la demande
  message:      { type: String, maxlength: 1000, default: null }, // message de l'utilisateur
  preferredDate: { type: String, default: null }, // date souhaitée (texte libre)
  preferredTime: { type: String, default: null }, // heure souhaitée
  consultationType: {
    type: String,
    enum: ['in_person', 'online'],
    default: 'in_person',
  },

  // Statut
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  },

  // Commission LinkMind (à remplir lors de la confirmation)
  sessionPrice:    { type: Number, default: null },
  commissionRate:  { type: Number, default: 0.10 }, // 10%
  commissionAmount:{ type: Number, default: null },

  // Notes admin
  adminNote: { type: String, default: null },
  confirmedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);