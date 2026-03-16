const geminiService = require('../services/gemini.service');
const { AppError } = require('../middleware/errorHandler');

// In-memory session store (use Redis in production)
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSession(userId) {
  const session = sessions.get(userId);
  if (!session || Date.now() - session.lastActivity > SESSION_TTL) {
    const newSession = { history: [], lastActivity: Date.now() };
    sessions.set(userId, newSession);
    return newSession;
  }
  return session;
}

/**
 * POST /api/assistant/chat
 * Body: { message, context? }
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
    const session = getSession(userId);

    // Get AI response
    const response = await geminiService.chat(message.trim(), session.history, context || {});

    // Update session history
    session.history.push({ role: 'user', content: message.trim() });
    session.history.push({ role: 'assistant', content: response.message });
    session.lastActivity = Date.now();

    // Keep history manageable (last 10 exchanges)
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    res.json({
      success: true,
      data: {
        message: response.message,
        severity: response.severity,
        suggestProfessional: response.suggestProfessional,
        professionalMessage: response.professionalMessage,
        quickActions: response.quickActions,
        sessionLength: session.history.length / 2,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/assistant/session
 * Clears conversation history
 */
exports.clearSession = async (req, res) => {
  const userId = req.user._id.toString();
  sessions.delete(userId);
  res.json({ success: true, message: 'Conversation réinitialisée' });
};