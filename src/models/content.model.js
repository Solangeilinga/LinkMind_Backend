const mongoose = require('mongoose');

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  icon:        { type: String, default: '🏅' },
  condition:   {
    type: { type: String, enum: ['mood_count', 'streak_days', 'challenge_count', 'points', 'custom'] },
    threshold: { type: Number },
  },
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

// ─── Stress Factor ────────────────────────────────────────────────────────────
const stressFactorSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true },
  label:    { type: String, required: true, trim: true },
  emoji:    { type: String, default: '💭' },
  category: { type: String, enum: ['academic', 'social', 'health', 'financial', 'personal', 'other'], default: 'other' },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
}, { timestamps: true });

// ─── Daily Message ────────────────────────────────────────────────────────────
const dailyMessageSchema = new mongoose.Schema({
  text:     { type: String, required: true, trim: true },
  emoji:    { type: String, default: '🌱' },
  category: { type: String, enum: ['motivation', 'wellbeing', 'gratitude', 'courage'], default: 'motivation' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Wellness Tip ─────────────────────────────────────────────────────────────
const wellnessTipSchema = new mongoose.Schema({
  moodId:      { type: String, required: true }, // 'stressed', 'anxious', 'tired', 'sad', 'neutral', 'good', 'great'
  emoji:       { type: String, default: '💡' },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  actionPath:  { type: String, default: null }, // route Flutter ex: '/challenges'
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

// ─── Mood Definition ──────────────────────────────────────────────────────────
const moodDefinitionSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true },
  label:    { type: String, required: true, trim: true },
  emoji:    { type: String, required: true },
  score:    { type: Number, required: true, min: 1, max: 5 },
  colorHex: { type: String, default: '#77021D' },
  order:    { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Professional Type ────────────────────────────────────────────────────────
const professionalTypeSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true }, // 'psychologist', 'coach', 'doctor'
  label:       { type: String, required: true, trim: true },   // 'Psychologue'
  labelPlural: { type: String, trim: true },                   // 'Psychologues'
  emoji:       { type: String, default: '🧑‍⚕️' },
  colorHex:    { type: String, default: '#77021D' },
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

// ─── Challenge Category ───────────────────────────────────────────────────────
const challengeCategorySchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  label:       { type: String, required: true, trim: true },
  labelPlural: { type: String, trim: true },
  emoji:       { type: String, default: '⚡' },
  colorHex:    { type: String, default: '#77021D' },
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

// ─── Challenge Difficulty ─────────────────────────────────────────────────────
const challengeDifficultySchema = new mongoose.Schema({
  id:            { type: String, required: true, unique: true }, // 'easy', 'medium', 'hard'
  label:         { type: String, required: true, trim: true },
  colorHex:      { type: String, default: '#77021D' },
  pointsMultiplier: { type: Number, default: 1 },
  order:         { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

// ─── Post Type ────────────────────────────────────────────────────────────────
const postTypeSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true },
  label:    { type: String, required: true, trim: true },
  emoji:    { type: String, default: '💬' },
  colorHex: { type: String, default: '#77021D' },
  isLegacy: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
}, { timestamps: true });

// Exports
module.exports = {
  Badge:               mongoose.model('Badge',               badgeSchema),
  StressFactor:        mongoose.model('StressFactor',        stressFactorSchema),
  DailyMessage:        mongoose.model('DailyMessage',        dailyMessageSchema),
  WellnessTip:         mongoose.model('WellnessTip',         wellnessTipSchema),
  MoodDefinition:      mongoose.model('MoodDefinition',      moodDefinitionSchema),
  ProfessionalType:    mongoose.model('ProfessionalType',    professionalTypeSchema),
  ChallengeCategory:   mongoose.model('ChallengeCategory',   challengeCategorySchema),
  ChallengeDifficulty: mongoose.model('ChallengeDifficulty', challengeDifficultySchema),
  PostType:            mongoose.model('PostType',            postTypeSchema),
};