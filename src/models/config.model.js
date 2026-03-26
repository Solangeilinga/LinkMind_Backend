const mongoose = require('mongoose');

// ─── Report Template ──────────────────────────────────────────────────────────
const reportTemplateSchema = new mongoose.Schema({
  moodRange: { type: String, enum: ['high', 'medium', 'low'], required: true, unique: true },
  title:     { type: String, required: true },
  conseil:   { type: String, required: true },
  emoji:     { type: String, default: '💡' },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

// ─── Assistant Starter ────────────────────────────────────────────────────────
const assistantStarterSchema = new mongoose.Schema({
  emoji:    { type: String, required: true },
  text:     { type: String, required: true, trim: true },
  context:  { type: String, enum: ['stressed', 'sad', 'tired', 'neutral', 'anxious', 'good'] },
  order:    { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  ReportTemplate:   mongoose.model('ReportTemplate',  reportTemplateSchema),
  AssistantStarter: mongoose.model('AssistantStarter', assistantStarterSchema),
};