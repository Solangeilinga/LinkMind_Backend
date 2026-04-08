const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// ✅ Import admin SDK Firebase
const admin = require('firebase-admin');

// ✅ Initialiser Firebase Admin (à faire une fois dans app.js)
let fcmInitialized = false;
const initFCM = () => {
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.log('⚠️ [FCM] Firebase non configuré');
    return;
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  fcmInitialized = true;
  console.log('✅ [FCM] Firebase initialisé');
};

// ─── Envoi push Firebase FCM ──────────────────────────────────────────────────
const sendPush = async (fcmToken, { title, body, data = {} }) => {
  if (!fcmInitialized) {
    console.log('[FCM] Firebase non initialisé');
    return;
  }
  
  if (!fcmToken) {
    console.log('[FCM] Pas de token FCM');
    return;
  }

  try {
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      token: fcmToken,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'default' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ [FCM] Push envoyé à ${fcmToken.substring(0, 10)}...: ${response}`);
    return response;
  } catch (error) {
    console.error('❌ [FCM] Erreur:', error.message);
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token invalide, le supprimer
      await User.findOneAndUpdate({ fcmToken }, { fcmToken: null });
    }
    throw error;
  }
};

// ─── Créer une notification in-app ────────────────────────────────────────────
const createNotification = async ({ recipientId, senderId, type, postId, commentId, title, body, emoji, metadata }) => {
  try {
    if (recipientId?.toString() === senderId?.toString()) return null;

    const notif = await Notification.create({
      recipient: recipientId,
      sender: senderId || null,
      type,
      postId: postId || null,
      commentId: commentId || null,
      title,
      body,
      emoji: emoji || '🔔',
      metadata: metadata || null,
    });

    // ✅ Envoi push FCM
    const recipient = await User.findById(recipientId).select('fcmToken preferences');
    if (recipient?.fcmToken && recipient?.preferences?.notificationsEnabled !== false) {
      await sendPush(recipient.fcmToken, {
        title,
        body,
        data: { type, postId: postId?.toString(), notifId: notif._id.toString() },
      }).catch(err => console.warn('[FCM] Push failed:', err.message));
    }

    return notif;
  } catch (err) {
    console.error('[Notification] createNotification error:', err.message);
    return null;
  }
};

// ─── Helpers par type d'action ─────────────────────────────────────────────────
const notifyComment = async ({ postAuthorId, senderId, postId, commentId, senderAlias }) => {
  return createNotification({
    recipientId: postAuthorId,
    senderId,
    type: 'comment',
    postId,
    commentId,
    emoji: '💬',
    title: 'Nouveau commentaire',
    body: `${senderAlias || '👤 Anonyme'} a commenté ton post`,
  });
};

const notifyReply = async ({ commentAuthorId, senderId, postId, commentId, senderAlias }) => {
  return createNotification({
    recipientId: commentAuthorId,
    senderId,
    type: 'reply',
    postId,
    commentId,
    emoji: '↩️',
    title: 'Nouvelle réponse',
    body: `${senderAlias || '👤 Anonyme'} a répondu à ton commentaire`,
  });
};

const notifyReaction = async ({ postAuthorId, senderId, postId, reactionType, senderAlias }) => {
  const emojiMap = { heart: '❤️', hug: '🤗', strong: '💪', fire: '🔥' };
  return createNotification({
    recipientId: postAuthorId,
    senderId,
    type: 'reaction',
    postId,
    emoji: emojiMap[reactionType] || '❤️',
    title: 'Nouvelle réaction',
    body: `${senderAlias || '👤 Anonyme'} a réagi à ton post ${emojiMap[reactionType] || ''}`,
    metadata: { reactionType },
  });
};

const notifySameFeeling = async ({ postAuthorId, senderId, postId, count }) => {
  return createNotification({
    recipientId: postAuthorId,
    senderId,
    type: 'same_feeling',
    postId,
    emoji: '🤝',
    title: 'Quelqu\'un ressent la même chose',
    body: `${count} personne${count > 1 ? 's ressentent' : ' ressent'} la même chose que toi`,
    metadata: { count },
  });
};

const notifyBadge = async ({ userId, badgeId, badgeName, badgeIcon }) => {
  return createNotification({
    recipientId: userId,
    senderId: null,
    type: 'badge',
    emoji: badgeIcon || '🏅',
    title: 'Nouveau badge obtenu !',
    body: `Tu as débloqué le badge "${badgeName}"`,
    metadata: { badgeId, badgeName, badgeIcon },
  });
};

// ✅ Initialiser FCM au chargement
initFCM();

module.exports = {
  createNotification,
  notifyComment,
  notifyReply,
  notifyReaction,
  notifySameFeeling,
  notifyBadge,
  initFCM,
};