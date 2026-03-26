const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true, trim: true },
  value:       { type: mongoose.Schema.Types.Mixed, required: true },
  type:        { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
  description: { type: String, trim: true },
  isPublic:    { type: Boolean, default: false }, // accessible sans auth ?
}, { timestamps: true });

// Helper statique pour récupérer une valeur facilement
appConfigSchema.statics.get = async function(key, defaultValue = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

appConfigSchema.statics.getMany = async function(keys) {
  const docs = await this.find({ key: { $in: keys } });
  return docs.reduce((acc, d) => { acc[d.key] = d.value; return acc; }, {});
};

module.exports = mongoose.model('AppConfig', appConfigSchema);