const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
  // Identité
  firstName:   { type: String, required: true, trim: true },
  lastName:    { type: String, required: true, trim: true },
  photo:       { type: String, default: null }, // URL photo
  bio:         { type: String, maxlength: 500, default: null },

  // Type
  type: {
    type: String,
    enum: ['psychologist', 'coach', 'doctor'],
    required: true,
  },
  specialties: [{ type: String, trim: true }], // ex: ['anxiété', 'dépression']

  // Contact & localisation
  city:      { type: String, trim: true, default: null },
  country:   { type: String, trim: true, default: 'Burkina Faso' },
  phone:     { type: String, trim: true, default: null },
  email:     { type: String, trim: true, default: null },
  whatsapp:  { type: String, trim: true, default: null },

  // Tarifs
  sessionPrice:    { type: Number, default: null }, // en FCFA
  sessionDuration: { type: Number, default: 60 },   // en minutes
  currency:        { type: String, default: 'FCFA' },
  isOnline:        { type: Boolean, default: false }, // consultation en ligne
  isInPerson:      { type: Boolean, default: true  }, // consultation en présentiel

  // Statut
  isActive:   { type: Boolean, default: true  },
  isVerified: { type: Boolean, default: false }, // vérifié par l'admin

  // Stats
  totalBookings: { type: Number, default: 0 },
  rating:        { type: Number, default: null, min: 1, max: 5 },

}, { timestamps: true });

module.exports = mongoose.model('Professional', professionalSchema);