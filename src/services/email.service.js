const nodemailer = require('nodemailer');

// ─── Configuration ─────────────────────────────────────────────────────────────
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // TLS pour le port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Timeout et retry
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
};

// Cache du transporter
let transporter = null;
let connectionVerified = false;

const getTransporter = () => {
  if (!transporter) {
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
      console.warn('⚠️ [EMAIL] SMTP non configuré. Les emails ne seront pas envoyés.');
      return null;
    }
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
};

// ─── Vérification de connexion SMTP ───────────────────────────────────────────
const verifyConnection = async () => {
  const transporter = getTransporter();
  if (!transporter) return false;
  
  try {
    await transporter.verify();
    console.log('✅ [EMAIL] Connexion SMTP établie');
    connectionVerified = true;
    return true;
  } catch (err) {
    console.error('❌ [EMAIL] Échec connexion SMTP:', err.message);
    console.error('📧 [EMAIL] Détails config:', {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      user: SMTP_CONFIG.auth.user ? `${SMTP_CONFIG.auth.user.substring(0, 5)}...` : 'undefined',
      hasPass: !!SMTP_CONFIG.auth.pass,
    });
    connectionVerified = false;
    return false;
  }
};

// ─── Template de base amélioré ─────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkMind</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #FAF7F5; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #77021D 0%, #A00328 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .code { background: #FAF7F5; border: 2px solid #77021D; border-radius: 16px; text-align: center; padding: 24px; margin: 24px 0; }
    .code span { font-size: 40px; font-weight: 800; color: #77021D; letter-spacing: 12px; font-family: monospace; }
    .button { display: inline-block; background: #77021D; color: white; text-decoration: none; padding: 12px 28px; border-radius: 40px; font-weight: 600; margin: 16px 0; }
    .footer { background: #F5EFED; padding: 20px 24px; text-align: center; font-size: 12px; color: #8A7070; }
    p { color: #2D2D2D; line-height: 1.6; margin: 0 0 16px; }
    .warning { background: #FFF3E0; padding: 12px; border-radius: 12px; color: #E65100; font-size: 13px; margin-top: 20px; }
    hr { border: none; border-top: 1px solid #E5D9D5; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧠 LinkMind</h1>
      <p>Prends soin de toi, un jour à la fois</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>LinkMind · Application de bien-être mental</p>
      <p>Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© ${new Date().getFullYear()} LinkMind — Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
`;

// ─── Envoi générique avec retry ────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }, retries = 3) => {
  // Mode développement : simuler l'envoi
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [DEV - Email non configuré] To: ${to} | Subject: ${subject}`);
    console.log(`📧 [DEV] Contenu simulé: ${html.substring(0, 200)}...`);
    return { messageId: 'dev-mode', response: 'Email simulé (mode développement)' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('SMTP non configuré');
  }

  console.log(`📧 [EMAIL] Envoi à ${to}...`);

  try {
    const info = await transporter.sendMail({
      from: `"LinkMind" <${SMTP_CONFIG.auth.user}>`,
      to,
      subject,
      html,
    });
    
    console.log(`✅ [EMAIL] Envoyé à ${to} - MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ [EMAIL] Erreur (${retries} retry left):`, err.message);
    
    // Si erreur d'authentification, ne pas réessayer
    if (err.message.includes('Invalid login') || err.message.includes('535') || err.message.includes('Authentication')) {
      console.error('❌ [EMAIL] Erreur d\'authentification - Vérifie SMTP_USER et SMTP_PASS');
      console.error('📧 [EMAIL] Assure-toi d\'utiliser un MOT DE PASSE D\'APPLICATION Gmail (16 caractères)');
      throw err;
    }
    
    // Timeout ou erreur réseau : on réessaie
    if (retries > 0) {
      console.log(`🔄 [EMAIL] Nouvel essai dans 2 secondes...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendEmail({ to, subject, html }, retries - 1);
    }
    
    throw err;
  }
};

// ─── OTP / Récupération de mot de passe ───────────────────────────────────────
const sendPasswordResetEmail = async (to, code) => {
  const html = baseTemplate(`
    <p><strong>🔐 Réinitialisation de ton mot de passe</strong></p>
    <p>Nous avons reçu une demande de réinitialisation pour ton compte LinkMind.</p>
    <div class="code"><span>${code}</span></div>
    <p>Ce code est valable <strong>10 minutes</strong>.</p>
    <p>Si tu n'as pas demandé cette réinitialisation, tu peux ignorer cet email en toute sécurité.</p>
    <div class="warning">
      ⚠️ <strong>Ne partage jamais ce code</strong><br>
      LinkMind ne te le demandera jamais par téléphone ou message.
    </div>
  `);
  
  return sendEmail({
    to,
    subject: '🔐 LinkMind — Code de réinitialisation de mot de passe',
    html,
  });
};

// ─── Vérification de compte ───────────────────────────────────────────────────
const sendVerificationEmail = async (to, code) => {
  const html = baseTemplate(`
    <p><strong>🎉 Bienvenue sur LinkMind !</strong></p>
    <p>Nous sommes ravis de t'accueillir dans notre communauté bien-être.</p>
    <p>Pour confirmer ton adresse email et activer ton compte, utilise ce code :</p>
    <div class="code"><span>${code}</span></div>
    <p>Ce code est valable <strong>10 minutes</strong>.</p>
    <p>Une fois ton email vérifié, tu pourras :</p>
    <ul style="color: #2D2D2D; margin: 16px 0;">
      <li>✅ Recevoir des notifications importantes</li>
      <li>✅ Récupérer ton mot de passe facilement</li>
      <li>✅ Accéder à toutes les fonctionnalités</li>
    </ul>
    <hr />
    <p style="font-size: 14px; text-align: center;">✨ Prends soin de toi,<br>L'équipe LinkMind</p>
  `);
  
  return sendEmail({
    to,
    subject: '🎉 LinkMind — Vérifie ton adresse email',
    html,
  });
};

// ─── Notification générale ────────────────────────────────────────────────────
const sendNotificationEmail = async (to, { title, message, buttonText, buttonUrl }) => {
  const buttonHtml = buttonText && buttonUrl 
    ? `<div style="text-align: center;"><a href="${buttonUrl}" class="button">${buttonText}</a></div>`
    : '';
  
  const html = baseTemplate(`
    <p><strong>📢 ${title}</strong></p>
    <p>${message}</p>
    ${buttonHtml}
  `);
  
  return sendEmail({ 
    to, 
    subject: `📢 LinkMind — ${title}`, 
    html 
  });
};

// ─── Email de bienvenue ───────────────────────────────────────────────────────
const sendWelcomeEmail = async (to, name) => {
  const html = baseTemplate(`
    <p><strong>Bienvenue ${name || 'sur LinkMind'} ! 🌱</strong></p>
    <p>Nous sommes heureux de t'avoir parmi nous.</p>
    <p>LinkMind est ton espace pour :</p>
    <ul style="color: #2D2D2D; margin: 16px 0;">
      <li>📊 Suivre ton humeur au quotidien</li>
      <li>🎯 Relever des défis personnalisés</li>
      <li>💬 Partager dans une communauté bienveillante</li>
      <li>🏅 Gagner des badges et progresser</li>
    </ul>
    <p>Pour commencer, explore ton tableau de bord et fais ton premier check-in d'humeur !</p>
    <div class="warning">
      💡 <strong>Astuce</strong> : Plus tu utilises l'application régulièrement, plus tu obtiendras des insights personnalisés sur ton bien-être.
    </div>
  `);
  
  return sendEmail({
    to,
    subject: '🌱 Bienvenue sur LinkMind — Commence ton voyage bien-être',
    html,
  });
};

// ─── Initialisation ───────────────────────────────────────────────────────────
// Vérifier la connexion au démarrage (ne pas bloquer l'app)
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  setTimeout(() => {
    verifyConnection().catch(console.warn);
  }, 2000);
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendNotificationEmail,
  sendWelcomeEmail,
  verifyConnection,
};