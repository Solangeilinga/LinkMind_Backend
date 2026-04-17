const cron = require('node-cron');
const User = require('../models/user.model');
const { GroupChallenge } = require('../models/community.model');
const { Challenge } = require('../models/challenge.model');

// ✅ Pool de défis pour les group challenges
const GROUP_CHALLENGE_POOL = [
  { challengeId: null, title: 'Méditation collective', icon: '🧘', durationDays: 7, targetParticipants: 50 },
  { challengeId: null, title: 'Défi sourire', icon: '😊', durationDays: 5, targetParticipants: 30 },
  { challengeId: null, title: 'Gratitude en groupe', icon: '🙏', durationDays: 7, targetParticipants: 40 },
  { challengeId: null, title: 'Marche solidaire', icon: '🚶', durationDays: 10, targetParticipants: 60 },
  { challengeId: null, title: 'Respiration collective', icon: '🌬️', durationDays: 3, targetParticipants: 20 },
];

/**
 * Daily cron jobs for LinkMind
 */
exports.scheduleDailyChallenge = () => {
  // Every day at midnight: reset streak for inactive users
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily streak check...');
    try {
      // Utilisateurs qui n'ont pas loggé leur humeur hier ni aujourd'hui
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      await User.updateMany(
        {
          lastActivityDate: { $lt: yesterday },
          streakDays: { $gt: 0 },
        },
        { $set: { streakDays: 0 } }
      );

      console.log('[CRON] Streak check complete.');
    } catch (err) {
      console.error('[CRON] Error:', err.message);
    }
  });

  // ✅ Every Monday at 8AM: create a new weekly group challenge
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON] Creating weekly group challenge...');
    try {
      await createWeeklyGroupChallenge();
    } catch (err) {
      console.error('[CRON] Error creating group challenge:', err.message);
    }
  });

  // ✅ Every day at 1AM: cleanup expired group challenges
  cron.schedule('0 1 * * *', async () => {
    console.log('[CRON] Cleaning up expired group challenges...');
    try {
      const result = await GroupChallenge.updateMany(
        { endDate: { $lt: new Date() }, isActive: true },
        { $set: { isActive: false } }
      );
      console.log(`[CRON] ${result.modifiedCount} group challenges expired`);
    } catch (err) {
      console.error('[CRON] Error cleaning group challenges:', err.message);
    }
  });

  console.log('⏰ Cron jobs scheduled');
};

// ✅ Fonction pour créer un group challenge hebdomadaire
async function createWeeklyGroupChallenge() {
  // Sélectionner un défi aléatoire
  const pool = [...GROUP_CHALLENGE_POOL];
  
  // Essayer de prendre un vrai challenge de la base
  const realChallenges = await Challenge.find({ isActive: true, isPremium: false }).limit(10);
  if (realChallenges.length > 0) {
    const randomChallenge = realChallenges[Math.floor(Math.random() * realChallenges.length)];
    pool.unshift({
      challengeId: randomChallenge._id,
      title: randomChallenge.title,
      icon: randomChallenge.icon,
      durationDays: Math.ceil(randomChallenge.durationMinutes / (24 * 60)),
      targetParticipants: 30 + Math.floor(Math.random() * 70),
    });
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + selected.durationDays);

  // Vérifier si un group challenge actif existe déjà
  const existing = await GroupChallenge.findOne({
    isActive: true,
    endDate: { $gt: now }
  });

  if (existing) {
    console.log('[CRON] Group challenge already active, skipping creation');
    return;
  }

  const groupChallenge = await GroupChallenge.create({
    challenge: selected.challengeId,
    title: selected.title,
    icon: selected.icon,
    description: `Défi de groupe : ${selected.title}. Rejoins la communauté pour réussir ensemble !`,
    targetParticipants: selected.targetParticipants,
    participantsCount: 0,
    completionsCount: 0,
    startDate: now,
    endDate: endDate,
    isActive: true,
  });

  console.log(`✅ [CRON] Group challenge created: ${selected.title} (ends ${endDate.toLocaleDateString()})`);
  return groupChallenge;
}

// ✅ Fonction manuelle pour créer un group challenge (admin)
exports.createManualGroupChallenge = async (challengeId, durationDays, targetParticipants) => {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw new Error('Challenge not found');

  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + durationDays);

  const groupChallenge = await GroupChallenge.create({
    challenge: challengeId,
    title: challenge.title,
    icon: challenge.icon,
    description: `Défi de groupe : ${challenge.title}. Rejoins la communauté !`,
    targetParticipants: targetParticipants || 50,
    participantsCount: 0,
    completionsCount: 0,
    startDate: now,
    endDate: endDate,
    isActive: true,
  });

  return groupChallenge;
};

// ✅ Récupérer les group challenges actifs
exports.getActiveGroupChallenges = async () => {
  const now = new Date();
  return await GroupChallenge.find({
    isActive: true,
    endDate: { $gte: now }
  }).populate('challenge', 'title icon category durationMinutes').sort({ endDate: 1 });
};