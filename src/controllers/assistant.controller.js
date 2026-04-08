const geminiService = require('../services/gemini.service');
const { AppError } = require('../middleware/errorHandler');
const User = require('../models/user.model');
const AppConfig = require('../models/app-config.model');
const AssistantSession = require('../models/assistant-session.model'); // ✅ Nouveau modèle

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// ✅ Remplacer la Map par MongoDB
async function getSession(userId) {
  let session = await AssistantSession.findOne({ userId });
  
  if (!session) {
    session = await AssistantSession.create({
      userId,
      history: [],
      lastActivity: new Date(),
    });
    return session;
  }
  
  // Vérifier expiration
  const lastActivity = session.lastActivity || session.createdAt;
  const inactiveTime = Date.now() - new Date(lastActivity).getTime();
  
  if (inactiveTime > SESSION_TTL) {
    // Session expirée, créer une nouvelle
    session.history = [];
    session.lastActivity = new Date();
    await session.save();
  }
  
  return session;
}

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

/**
 * POST /api/assistant/chat
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, context } = req.body;

    if (!message || message.trim().length === 0) {
      return next(new AppError('Le message ne peut pas être vide', 400));
    }

    if (message.length > 1000) {
      return next(new AppError('Message trop long (max 1000 caractères)', 400));
    }

    const userId = req.user._id.toString();

    // ── Vérification limite quotidienne (freemium uniquement) ──
    const user = await User.findById(userId);
    const DAILY_LIMIT = await AppConfig.get('mindo_daily_limit', 10);
    
    if (!user.isPremium) {
      const today = new Date();
      const lastDate = user.mindoLastMessageDate ? new Date(user.mindoLastMessageDate) : null;

      const currentCount = (lastDate && isSameDay(lastDate, today))
        ? user.mindoMessageCount
        : 0;

      if (currentCount >= DAILY_LIMIT) {
        return res.status(429).json({
          error: 'limit_reached',
          message: `Tu as atteint ta limite de ${DAILY_LIMIT} messages aujourd'hui.`,
          messagesUsed: currentCount,
          messagesLimit: DAILY_LIMIT,
          isPremium: false,
        });
      }

      // Incrémenter le compteur
      await User.findByIdAndUpdate(userId, {
        mindoMessageCount: currentCount + 1,
        mindoLastMessageDate: today,
      });
    }

    // ✅ Session MongoDB
    const session = await getSession(userId);

    // Get AI response
    const response = await geminiService.chat(message.trim(), session.history, context || {});

    // Update session history
    session.history.push({ role: 'user', content: message.trim() });
    session.history.push({ role: 'assistant', content: response.message });
    session.lastActivity = new Date();

    // Keep history manageable (last 10 exchanges)
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }
    
    await session.save();

    // Re-fetch updated count for response
    const updatedUser = await User.findById(userId).select('isPremium mindoMessageCount mindoLastMessageDate');
    const today2 = new Date();
    const lastDate2 = updatedUser.mindoLastMessageDate ? new Date(updatedUser.mindoLastMessageDate) : null;
    const usedToday = (!updatedUser.isPremium && lastDate2 && isSameDay(lastDate2, today2))
      ? updatedUser.mindoMessageCount : 0;

    res.json({
      success: true,
      data: {
        message: response.message,
        severity: response.severity,
        suggestProfessional: response.suggestProfessional,
        professionalMessage: response.professionalMessage,
        quickActions: response.quickActions,
        sessionLength: session.history.length / 2,
        messagesUsed: updatedUser.isPremium ? null : usedToday,
        messagesLimit: updatedUser.isPremium ? null : DAILY_LIMIT,
        isPremium: updatedUser.isPremium,
      },
    });
  } catch (error) {
    const isNetwork = error.message?.includes('fetch failed') || error.message?.includes('network');
    const isQuota = error.message?.includes('quota') || error.message?.includes('429');
    
    const fallbackMessage = isNetwork
      ? 'Je ne peux pas te répondre pour l\'instant (problème de connexion réseau). Réessaie dans quelques instants. 🌐'
      : isQuota
      ? 'Je suis un peu débordé en ce moment ! Réessaie dans quelques secondes. ⏳'
      : 'Je rencontre une difficulté technique temporaire. Réessaie dans un moment. 🔧';

    res.json({
      success: true,
      data: {
        message: fallbackMessage,
        severity: 'low',
        suggestProfessional: false,
        professionalMessage: null,
        quickActions: [],
        isError: true,
      },
    });
  }
};

/**
 * DELETE /api/assistant/session
 * Clears conversation history
 */
exports.clearSession = async (req, res) => {
  const userId = req.user._id.toString();
  await AssistantSession.findOneAndDelete({ userId });
  res.json({ success: true, message: 'Conversation réinitialisée' });
};