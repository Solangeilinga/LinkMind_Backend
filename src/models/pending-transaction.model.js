const mongoose = require('mongoose');

const pendingTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['cinetpay', 'orange'], required: true },
  amount: { type: Number, required: true },
  plan: { type: String, enum: ['monthly', 'yearly'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  completedAt: { type: Date },
  paymentMethod: { type: String },
}, { timestamps: true });

// Index TTL pour nettoyer les transactions en attente après 7 jours
pendingTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('PendingTransaction', pendingTransactionSchema);