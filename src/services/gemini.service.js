// gemini.service.js - Version avec quota intégré
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/user.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SEVERITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };

const SYSTEM_INSTRUCTION = `Tu es "Mindo", assistant bien-être pour étudiants. Réponds en français, ton bienveillant.
Règles: concis (max 4 paragraphes), 1 question max, jamais de diagnostic.
Si détresse grave/pensées de se faire du mal → suggestProfessional:true, severity:"high".
Réponds UNIQUEMENT en JSON: {"message":"...","severity":"low"|"medium"|"high","suggestProfessional":bool,"professionalMessage":null|"...","quickActions":["...","...","..."]}
severity: low=stress normal, medium=anxiété/tristesse persistante, high=détresse grave.`;

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    });
  }

  // ✅ Vérifier le quota avant d'appeler Gemini
  async checkQuota(userId) {
    const user = await User.findById(userId).select('isPremium mindoMessageCount mindoLastMessageDate');
    if (!user) return { allowed: false, remaining: 0, limit: 10 };
    
    if (user.isPremium) return { allowed: true, remaining: -1, limit: -1 };
    
    const today = new Date();
    const lastDate = user.mindoLastMessageDate ? new Date(user.mindoLastMessageDate) : null;
    
    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    
    const currentCount = (lastDate && isSameDay(lastDate, today)) ? user.mindoMessageCount : 0;
    const DAILY_LIMIT = 10;
    const remaining = Math.max(0, DAILY_LIMIT - currentCount);
    
    return { allowed: remaining > 0, remaining, limit: DAILY_LIMIT, currentCount };
  }

  // ✅ Incrémenter le compteur après un message
  async incrementQuota(userId) {
    const user = await User.findById(userId);
    if (!user || user.isPremium) return;
    
    const today = new Date();
    const lastDate = user.mindoLastMessageDate ? new Date(user.mindoLastMessageDate) : null;
    
    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    
    const currentCount = (lastDate && isSameDay(lastDate, today)) ? user.mindoMessageCount : 0;
    
    user.mindoMessageCount = currentCount + 1;
    user.mindoLastMessageDate = today;
    await user.save({ validateBeforeSave: false });
  }

  async chat(userMessage, history = [], context = {}, userId = null) {
    try {
      // ✅ Vérifier le quota si userId fourni
      if (userId) {
        const quota = await this.checkQuota(userId);
        if (!quota.allowed) {
          throw new Error(`QUOTA_EXCEEDED: ${quota.remaining} messages restants`);
        }
      }

      let message = userMessage;
      if (context.mood) {
        message = `[humeur: ${context.mood}${context.stressLevel ? ', stress: ' + context.stressLevel + '/5' : ''}] ${userMessage}`;
      }

      const recentHistory = history.slice(-12);
      const geminiHistory = recentHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = this.model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(message);
      
      // ✅ Incrémenter le quota après succès
      if (userId) {
        await this.incrementQuota(userId);
      }
      
      return this._parseResponse(result.response.text().trim());

    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const chat2 = this.model.startChat({ history: [] });
          const result2 = await chat2.sendMessage(userMessage);
          if (userId) await this.incrementQuota(userId);
          return this._parseResponse(result2.response.text().trim());
        } catch {
          throw new Error('Assistant momentanément indisponible. Réessaie dans quelques secondes. ⏳');
        }
      }
      if (error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Limite quotidienne atteinte. Passe Premium pour continuer. 👑');
      }
      console.error('Gemini error:', error.message);
      throw new Error('Service assistant temporairement indisponible');
    }
  }

  _parseResponse(raw) {
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        message: parsed.message || 'Je suis là pour t\'écouter. Peux-tu m\'en dire plus ?',
        severity: Object.values(SEVERITY).includes(parsed.severity) ? parsed.severity : SEVERITY.LOW,
        suggestProfessional: Boolean(parsed.suggestProfessional),
        professionalMessage: parsed.professionalMessage || null,
        quickActions: Array.isArray(parsed.quickActions) ? parsed.quickActions.slice(0, 3) : [],
      };
    } catch {
      return {
        message: raw.length > 20 ? raw : 'Je suis là pour toi. Comment puis-je t\'aider ?',
        severity: SEVERITY.LOW,
        suggestProfessional: false,
        professionalMessage: null,
        quickActions: [],
      };
    }
  }
}

module.exports = new GeminiService();