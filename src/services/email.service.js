const nodemailer = require('nodemailer');

// ─── Transporter ──────────────────────────────────────────────────────────────
const createTransporter = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Template de base ─────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #FAF7F5; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff;
                 border-radius: 16px; overflow: hidden;
                 box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: #77021D; padding: 32px 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .header p  { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .code { background: #FAF7F5; border: 2px solid #77021D; border-radius: 12px;
            text-align: center; padding: 20px; margin: 24px 0; }
    .code span { font-size: 36px; font-weight: 900; color: #77021D;
                 letter-spacing: 8px; }
    .footer { background: #F5EFED; padding: 16px 24px; text-align: center;
              font-size: 12px; color: #8A7070; }
    p { color: #333; line-height: 1.6; }
    .warning { color: #8A7070; font-size: 13px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧠 LinkMind</h1>
      <p>Ton espace bien-être</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      LinkMind · Ne réponds pas à cet email<br>
      Si tu n'es pas à l'origine de cette demande, ignore ce message.
    </div>
  </div>
</body>
</html>
`;

// ─── Envoi générique ──────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[DEV - Email non configuré] To: ${to} | Subject: ${subject}`);
    return;
  }

  console.log(`[Email] Tentative envoi à ${to}...`);
  console.log(`[Email] SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`[Email] From: ${process.env.SMTP_USER}`);

  const transporter = createTransporter();

  // Vérifier la connexion SMTP avant d'envoyer
  try {
    await transporter.verify();
    console.log('[Email] Connexion SMTP OK');
  } catch (verifyErr) {
    console.error('[Email] Erreur connexion SMTP:', verifyErr.message);
    throw verifyErr;
  }

  const info = await transporter.sendMail({
    from: `"LinkMind" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`[Email] Envoyé ✅ MessageId: ${info.messageId}`);
  console.log(`[Email] Response: ${info.response}`);
};

// ─── OTP / Récupération de mot de passe ──────────────────────────────────────
const sendPasswordResetEmail = async (to, code) => {
  const html = baseTemplate(`
    <p>Bonjour,</p>
    <p>Tu as demandé à réinitialiser ton mot de passe LinkMind. Voici ton code :</p>
    <div class="code"><span>${code}</span></div>
    <p>Ce code est valable <strong>10 minutes</strong>.</p>
    <p class="warning">⚠️ Ne partage jamais ce code. LinkMind ne te le demandera jamais.</p>
  `);
  await sendEmail({
    to,
    subject: 'LinkMind — Code de réinitialisation de mot de passe',
    html,
  });
};

// ─── Vérification de compte ───────────────────────────────────────────────────
const sendVerificationEmail = async (to, code) => {
  const html = baseTemplate(`
    <p>Bienvenue sur LinkMind ! 🎉</p>
    <p>Pour vérifier ton adresse email, utilise ce code :</p>
    <div class="code"><span>${code}</span></div>
    <p>Ce code est valable <strong>10 minutes</strong>.</p>
  `);
  await sendEmail({
    to,
    subject: 'LinkMind — Vérifie ton adresse email',
    html,
  });
};

// ─── Notification générale ────────────────────────────────────────────────────
const sendNotificationEmail = async (to, { title, message }) => {
  const html = baseTemplate(`
    <p><strong>${title}</strong></p>
    <p>${message}</p>
  `);
  await sendEmail({ to, subject: `LinkMind — ${title}`, html });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendNotificationEmail,
};