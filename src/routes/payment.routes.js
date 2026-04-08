const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/user.model');
const { authenticate } = require('../middleware/auth.middleware');
const { sendEmail } = require('../services/email.service');

// Configuration paiement
const PAYMENT_CONFIG = {
  cinetpay: {
    apiKey: process.env.CINETPAY_API_KEY,
    siteId: process.env.CINETPAY_SITE_ID,
    secretKey: process.env.CINETPAY_SECRET_KEY,
    returnUrl: process.env.CINETPAY_RETURN_URL,
    notifyUrl: process.env.CINETPAY_NOTIFY_URL,
  },
  orangeMoney: {
    merchantKey: process.env.ORANGE_MERCHANT_KEY,
    accessToken: process.env.ORANGE_ACCESS_TOKEN,
    returnUrl: process.env.ORANGE_RETURN_URL,
    notifyUrl: process.env.ORANGE_NOTIFY_URL,
  }
};

// ─── INITIER UN PAIEMENT ──────────────────────────────────────────────────────
router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const { provider, amount, plan } = req.body; // provider: 'cinetpay' ou 'orange'
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Prix Premium (à ajuster)
    const PREMIUM_PRICES = {
      monthly: 5000, // FCFA
      yearly: 50000, // FCFA
    };

    const price = PREMIUM_PRICES[plan] || PREMIUM_PRICES.monthly;

    // Générer un ID de transaction unique
    const transactionId = `TXN_${Date.now()}_${userId.toString().slice(-6)}`;

    // Stocker la transaction en attente (dans MongoDB)
    const PendingTransaction = require('../models/pending-transaction.model');
    await PendingTransaction.create({
      transactionId,
      userId,
      provider,
      amount: price,
      plan,
      status: 'pending',
      createdAt: new Date(),
    });

    if (provider === 'cinetpay') {
      // Préparer la requête CinetPay
      const paymentData = {
        apikey: PAYMENT_CONFIG.cinetpay.apiKey,
        site_id: PAYMENT_CONFIG.cinetpay.siteId,
        transaction_id: transactionId,
        amount: price,
        currency: 'XAF',
        description: `Abonnement Premium LinkMind - ${plan}`,
        notify_url: PAYMENT_CONFIG.cinetpay.notifyUrl,
        return_url: PAYMENT_CONFIG.cinetpay.returnUrl,
        customer_name: user.name || `${user.firstName} ${user.lastName}`,
        customer_email: user.email,
        customer_phone: user.phone,
      };

      // Générer le token
      const signature = crypto
        .createHmac('sha256', PAYMENT_CONFIG.cinetpay.secretKey)
        .update(JSON.stringify(paymentData))
        .digest('hex');

      paymentData.signature = signature;

      res.json({
        provider: 'cinetpay',
        transactionId,
        paymentUrl: 'https://api-checkout.cinetpay.com/v2/payment',
        paymentData,
      });
    } 
    else if (provider === 'orange') {
      res.json({
        provider: 'orange',
        transactionId,
        paymentUrl: 'https://api.orange.com/orange-money-webpay/dev/v1/webpayment',
        merchantKey: PAYMENT_CONFIG.orangeMoney.merchantKey,
        amount: price,
        orderId: transactionId,
      });
    }
    else {
      return res.status(400).json({ error: 'Provider non supporté' });
    }
  } catch (err) {
    console.error('❌ [PAYMENT_INIT] Erreur:', err);
    next(err);
  }
});

// ─── WEBHOOK CinetPay (notification automatique) ─────────────────────────────
router.post('/webhook/cinetpay', async (req, res, next) => {
  try {
    const { transaction_id, status, amount, currency, payment_method } = req.body;

    console.log(`📦 [WEBHOOK] CinetPay: ${transaction_id} - ${status}`);

    if (status === 'ACCEPTED' || status === 'PAID' || status === 'SUCCESS') {
      const PendingTransaction = require('../models/pending-transaction.model');
      const transaction = await PendingTransaction.findOne({ transactionId: transaction_id });

      if (!transaction) {
        console.log(`⚠️ Transaction ${transaction_id} non trouvée`);
        return res.json({ error: 'Transaction not found' });
      }

      if (transaction.status === 'completed') {
        console.log(`⚠️ Transaction ${transaction_id} déjà traitée`);
        return res.json({ message: 'Already processed' });
      }

      // Activer le compte Premium
      const user = await User.findById(transaction.userId);
      if (user) {
        const duration = transaction.plan === 'yearly' ? 365 : 30;
        user.isPremium = true;
        user.premiumExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
        await user.save();

        // Marquer transaction comme complétée
        transaction.status = 'completed';
        transaction.completedAt = new Date();
        transaction.paymentMethod = payment_method;
        await transaction.save();

        // Envoyer email de confirmation
        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: '🎉 LinkMind Premium activé !',
            html: `
              <h2>Félicitations !</h2>
              <p>Ton abonnement Premium LinkMind est maintenant actif.</p>
              <p>Tu as maintenant accès à :</p>
              <ul>
                <li>✅ Mindo illimité</li>
                <li>✅ Rapports PDF exportables</li>
                <li>✅ Expérience sans publicités</li>
              </ul>
              <p>Merci de faire partie de notre communauté ! 💚</p>
            `,
          }).catch(() => {});
        }

        console.log(`✅ Premium activé pour ${user.email} (${transaction.plan})`);
      }
    }

    res.json({ message: 'Webhook processed' });
  } catch (err) {
    console.error('❌ [WEBHOOK_CINETPAY] Erreur:', err);
    res.json({ error: err.message });
  }
});

// ─── WEBHOOK Orange Money ────────────────────────────────────────────────────
router.post('/webhook/orange', async (req, res, next) => {
  try {
    const { order_id, status, amount } = req.body;

    console.log(`📦 [WEBHOOK] Orange Money: ${order_id} - ${status}`);

    if (status === 'SUCCESS' || status === 'PAID') {
      const PendingTransaction = require('../models/pending-transaction.model');
      const transaction = await PendingTransaction.findOne({ transactionId: order_id });

      if (!transaction || transaction.status === 'completed') {
        return res.json({ message: 'Already processed' });
      }

      const user = await User.findById(transaction.userId);
      if (user) {
        const duration = transaction.plan === 'yearly' ? 365 : 30;
        user.isPremium = true;
        user.premiumExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
        await user.save();

        transaction.status = 'completed';
        transaction.completedAt = new Date();
        await transaction.save();

        console.log(`✅ Premium activé pour ${user.email} via Orange Money`);
      }
    }

    res.json({ message: 'Webhook processed' });
  } catch (err) {
    console.error('❌ [WEBHOOK_ORANGE] Erreur:', err);
    res.json({ error: err.message });
  }
});

// ─── VÉRIFIER STATUT PREMIUM ─────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('isPremium premiumExpiresAt');
    
    let isActive = user.isPremium;
    if (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
      // Premium expiré
      isActive = false;
      user.isPremium = false;
      await user.save();
    }

    res.json({
      isPremium: isActive,
      expiresAt: user.premiumExpiresAt,
      daysLeft: user.premiumExpiresAt 
        ? Math.max(0, Math.ceil((new Date(user.premiumExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;