const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// ─── Créer une notification in-app ────────────────────────────────────────────
const createNotification = async ({ recipientId, senderId, type, postId, commentId, title, body, emoji, metadata }) => {
  try {
    // Ne pas notifier soi-même
    if (recipientId?.toString() === senderId?.toString()) return null;

    const notif = await Notification.create({
      recipient: recipientId,
      sender:    senderId || null,
      type,
      postId:    postId    || null,
      commentId: commentId || null,
      title,
      body,
      emoji:    emoji || '🔔',
      metadata: metadata || null,
    });

    // Envoyer push FCM si token disponible
    const recipient = await User.findById(recipientId).select('fcmToken preferences');
    if (recipient?.fcmToken && recipient?.preferences?.notificationsEnabled !== false) {
      await sendPush(recipient.fcmToken, { title, body, data: { type, postId: postId?.toString(), notifId: notif._id.toString() } })
        .catch(err => console.warn('[FCM] Push failed:', err.message));
    }

    return notif;
  } catch (err) {
    console.error('[Notification] createNotification error:', err.message);
    return null;
  }
};

// ─── Envoi push Firebase FCM ──────────────────────────────────────────────────
const sendPush = async (fcmToken, { title, body, data = {} }) => {
  if (!process.env.FCM_SERVER_KEY) {
    console.log('[FCM] FCM_SERVER_KEY non configuré — push ignoré');
    return;
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: { title, body, sound: 'default' },
      data,
      priority: 'high',
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM HTTP ${response.status}`);
  }
  return response.json();
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
    body:  `${senderAlias || '👤 Anonyme'} a commenté ton post`,
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
    body:  `${senderAlias || '👤 Anonyme'} a répondu à ton commentaire`,
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
    body:  `${senderAlias || '👤 Anonyme'} a réagi à ton post ${emojiMap[reactionType] || ''}`,
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
    body:  `${count} personne${count > 1 ? 's ressentent' : ' ressent'} la même chose que toi`,
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
    body:  `Tu as débloqué le badge "${badgeName}"`,
    metadata: { badgeId, badgeName, badgeIcon },
  });
};

module.exports = {
  createNotification,
  notifyComment,
  notifyReply,
  notifyReaction,
  notifySameFeeling,
  notifyBadge,
};