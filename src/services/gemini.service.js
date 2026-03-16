const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SEVERITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };

// Compact system prompt — passed via systemInstruction (not counted in chat history)
const SYSTEM_INSTRUCTION = `Tu es "Mindo", assistant bien-être pour étudiants. Réponds en français, ton bienveillant.
Règles: concis (max 4 paragraphes), 1 question max, jamais de diagnostic.
Si détresse grave/pensées de se faire du mal → suggestProfessional:true, severity:"high".
Réponds UNIQUEMENT en JSON: {"message":"...","severity":"low"|"medium"|"high","suggestProfessional":bool,"professionalMessage":null|"...","quickActions":["...","...","..."]}
severity: low=stress normal, medium=anxiété/tristesse persistante, high=détresse grave.`;

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      // systemInstruction is sent separately and not billed as conversation tokens
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    });
  }

  async chat(userMessage, history = [], context = {}) {
    try {
      // Short context prefix (only if relevant info available)
      let message = userMessage;
      if (context.mood) {
        message = `[humeur: ${context.mood}${context.stressLevel ? ', stress: ' + context.stressLevel + '/5' : ''}] ${userMessage}`;
      }

      // Build lean history (last 6 exchanges max to save tokens)
      const recentHistory = history.slice(-12);
      const geminiHistory = recentHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = this.model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(message);
      return this._parseResponse(result.response.text().trim());

    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const chat2 = this.model.startChat({ history: [] });
          const result2 = await chat2.sendMessage(userMessage);
          return this._parseResponse(result2.response.text().trim());
        } catch {
          throw new Error('Assistant momentanément indisponible. Réessaie dans quelques secondes. ⏳');
        }
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