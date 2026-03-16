const { Challenge } = require('../models/challenge.model');
const { ChallengeCompletion } = require('../models/challenge.model');

/**
 * Core personalized recommendation engine.
 * Based on: current mood, mood score, user level/points, recent activity.
 */
exports.getPersonalizedRecommendations = async (userId, moodScore, moodLabel, totalPoints) => {
  const today = new Date().toISOString().split('T')[0];

  // Get already completed today
  const completedToday = await ChallengeCompletion.find({ user: userId, date: today }).select('challenge');
  const completedIds = completedToday.map(c => c.challenge.toString());

  // Determine strategy based on mood
  let strategy;
  let categories;

  if (moodScore <= 1 || moodLabel === 'stressed' || moodLabel === 'anxious') {
    strategy = 'immediate_relief';
    categories = ['breathing', 'meditation'];
  } else if (moodScore === 2 || moodLabel === 'tired' || moodLabel === 'sad') {
    strategy = 'gentle_support';
    categories = ['meditation', 'journaling', 'gratitude'];
  } else if (moodScore === 3 || moodLabel === 'neutral') {
    strategy = 'engagement';
    categories = ['gratitude', 'movement', 'game', 'creativity'];
  } else if (moodScore >= 4 || moodLabel === 'good' || moodLabel === 'great') {
    strategy = 'growth';
    categories = ['creativity', 'social', 'movement', 'game'];
  } else {
    strategy = 'balanced';
    categories = ['breathing', 'gratitude', 'movement'];
  }

  // Point-based difficulty filter
  let difficulty;
  if (totalPoints < 200) difficulty = ['easy'];
  else if (totalPoints < 800) difficulty = ['easy', 'medium'];
  else difficulty = ['easy', 'medium', 'hard'];

  // Fetch recommended challenges
  const recommended = await Challenge.find({
    isActive: true,
    category: { $in: categories },
    difficulty: { $in: difficulty },
    _id: { $nin: completedIds },
  }).limit(4);

  // Build recommendation with explanation
  const result = {
    strategy,
    message: getStrategyMessage(strategy, moodScore),
    challenges: recommended.map(c => ({
      ...c.toObject(),
      reason: getChallengeReason(c.category, strategy),
    })),
    tip: getDailyTip(moodScore, moodLabel),
  };

  return result;
};

function getStrategyMessage(strategy, score) {
  const messages = {
    immediate_relief: '😮‍💨 Ton niveau de stress est élevé. Voici des exercices rapides pour te détendre maintenant.',
    gentle_support: '🫶 Tu sembles fatigué(e). Ces activités douces vont t\'aider à retrouver de l\'énergie.',
    engagement: '🌱 Bonne journée pour explorer de nouvelles activités et améliorer ton bien-être.',
    growth: '🚀 Tu es en pleine forme ! Profites-en pour te dépasser avec des défis stimulants.',
    balanced: '⚖️ Voici une sélection équilibrée pour ton bien-être du jour.',
  };
  return messages[strategy] || messages.balanced;
}

function getChallengeReason(category, strategy) {
  const reasons = {
    breathing: 'Réduit le stress en quelques minutes',
    meditation: 'Calme l\'esprit et améliore la concentration',
    journaling: 'Aide à clarifier tes pensées et émotions',
    gratitude: 'Renforce les émotions positives',
    movement: 'Libère des endorphines, bouste ton énergie',
    social: 'Renforce le sentiment de connexion',
    creativity: 'Stimule l\'esprit et réduit l\'anxiété',
    game: 'Distraction positive et amusante',
  };
  return reasons[category] || 'Bon pour ton bien-être';
}

function getDailyTip(score, label) {
  const tips = {
    stressed: [
      'La respiration profonde active le système nerveux parasympathique, réduisant le cortisol en moins de 3 minutes.',
      'Écrire ce qui te stresse permet de l\'externaliser et de réduire sa charge mentale.',
      'Une marche de 10 minutes peut réduire l\'anxiété autant qu\'un antistress léger.',
    ],
    anxious: [
      'La règle 5-4-3-2-1 : nomme 5 choses que tu vois, 4 que tu entends, 3 que tu touches.',
      'L\'anxiété est temporaire. Rappelle-toi un moment où tu t\'en es sorti(e).',
    ],
    tired: [
      'La fatigue cognitive n\'est pas la même que la fatigue physique. Une pause active peut aider.',
      'Boire un verre d\'eau et s\'étirer 2 minutes peut recharger ton énergie mentale.',
    ],
    sad: [
      'Il est normal de ne pas aller bien. Identifier l\'émotion est déjà un grand pas.',
      'La gratitude, même pour de petites choses, active les circuits du bien-être dans le cerveau.',
    ],
    neutral: [
      'Un acte de gentillesse envers quelqu\'un améliore aussi ton propre bien-être.',
      'Mettre des mots sur tes objectifs du jour augmente de 42% les chances de les accomplir.',
    ],
    good: [
      'Note ce qui rend cette journée bonne — tu pourras t\'en souvenir lors des jours difficiles.',
    ],
    great: [
      'Partage ton énergie positive avec la communauté. Le bien-être est contagieux !',
    ],
  };

  const labelTips = tips[label] || tips.neutral;
  return labelTips[Math.floor(Math.random() * labelTips.length)];
}
