// backend/config/firebase.js
const admin = require('firebase-admin');

let firebaseApp = null;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  // Vérifier si les variables sont présentes
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_CLIENT_EMAIL || 
      !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('⚠️ Firebase non configuré - les notifications push ne fonctionneront pas');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialisé');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error.message);
    return null;
  }
};

const getMessaging = () => {
  const app = initFirebase();
  return app ? admin.messaging(app) : null;
};

module.exports = { initFirebase, getMessaging };