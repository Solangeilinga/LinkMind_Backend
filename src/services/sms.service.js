const axios = require('axios');

// ─── LAfricaMobile SMS Service ────────────────────────────────────────────────
const LAM_ACCOUNT_ID = process.env.LAM_ACCOUNT_ID; // ton login LAfricaMobile
const LAM_PASSWORD   = process.env.LAM_PASSWORD;    // ton mot de passe LAfricaMobile
const LAM_SENDER     = process.env.LAM_SENDER || 'LinkMind'; // nom affiché sur le SMS
const LAM_API_URL    = 'https://lamsms.lafricamobile.com/api';

/**
 * Envoie un SMS via LAfricaMobile (LAMPUSH)
 * @param {string} to    - Numéro international ex: +22661645069
 * @param {string} text  - Contenu du message
 */
const sendSMS = async (to, text) => {
  // LAfricaMobile attend le format 00XXXXXXXXXXX (sans le +)
  const phone = to.replace(/^\+/, '00');

  const xml = `<push accountid="${LAM_ACCOUNT_ID}" password="${LAM_PASSWORD}"><message><sender>${LAM_SENDER}</sender><text>${text}</text><to>${phone}</to></message></push>`;

  // Passer le XML directement dans l'URL (comme dans la doc officielle)
  const url = `${LAM_API_URL}?xml=${encodeURIComponent(xml)}`;

  console.log(`[SMS] Envoi vers ${phone}...`);

  let response;
  try {
    response = await axios.get(url, { timeout: 10000 });
  } catch (err) {
    // Lire le corps de la réponse même en cas d'erreur HTTP
    const errBody = err.response?.data?.toString() ?? 'pas de corps';
    const errStatus = err.response?.status ?? 'inconnu';
    console.error(`[SMS] Erreur ${errStatus} - Réponse LAfricaMobile: ${errBody}`);
    console.error(`[SMS] URL envoyée: ${url}`);
    throw new Error(`LAfricaMobile ${errStatus}: ${errBody}`);
  }

  const body = response.data?.toString() ?? '';
  console.log(`[SMS] Réponse LAfricaMobile: ${body}`);

  if (body.toLowerCase().includes('error')) {
    throw new Error(`LAfricaMobile error: ${body}`);
  }

  return body;
};

/**
 * Envoie un code OTP par SMS
 * @param {string} to   - Numéro international
 * @param {string} code - Code à 6 chiffres
 */
const sendOTP = async (to, code) => {
  const text = `LinkMind - Ton code de vérification : ${code}. Valable 10 minutes. Ne le partage pas.`;
  return await sendSMS(to, text);
};

/**
 * Envoie un SMS de récupération de compte
 * @param {string} to   - Numéro international
 * @param {string} code - Code à 6 chiffres
 */
const sendPasswordReset = async (to, code) => {
  const text = `LinkMind - Code de réinitialisation : ${code}. Valable 10 minutes. Si tu n'as pas demandé ça, ignore ce message.`;
  return await sendSMS(to, text);
};

module.exports = { sendSMS, sendOTP, sendPasswordReset };