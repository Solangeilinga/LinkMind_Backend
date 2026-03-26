require('dotenv').config();
const mongoose = require('mongoose');
const { Badge, StressFactor, DailyMessage, WellnessTip, MoodDefinition, ProfessionalType, ChallengeCategory, ChallengeDifficulty, PostType } = require('../models/content.model');

// ─── Badges ───────────────────────────────────────────────────────────────────
const badges = [
  { id: 'first_mood',     name: 'Premier pas',        icon: '🌱', description: 'Enregistre ton humeur pour la première fois',   condition: { type: 'mood_count',      threshold: 1   }, order: 1 },
  { id: 'mood_7days',     name: 'Observateur',         icon: '📊', description: "Enregistre l'humeur 7 jours d'affilée",          condition: { type: 'mood_count',      threshold: 7   }, order: 2 },
  { id: 'streak_7',       name: 'Régularité 7J',       icon: '🔥', description: "7 jours de suite d'activité",                   condition: { type: 'streak_days',     threshold: 7   }, order: 3 },
  { id: 'streak_30',      name: "Maître de l'habitude",icon: '💎', description: '30 jours consécutifs',                          condition: { type: 'streak_days',     threshold: 30  }, order: 4 },
  { id: 'challenges_5',   name: 'Actif',               icon: '⚡', description: 'Complète 5 défis',                              condition: { type: 'challenge_count', threshold: 5   }, order: 5 },
  { id: 'challenges_20',  name: 'Motivé(e)',            icon: '🏆', description: 'Complète 20 défis',                             condition: { type: 'challenge_count', threshold: 20  }, order: 6 },
  { id: 'challenges_50',  name: 'Champion(ne)',         icon: '🥇', description: 'Complète 50 défis',                             condition: { type: 'challenge_count', threshold: 50  }, order: 7 },
  { id: 'points_500',     name: 'Niveau Argent',        icon: '🥈', description: "Atteins 500 points d'énergie mentale",          condition: { type: 'points',          threshold: 500 }, order: 8 },
  { id: 'points_1000',    name: 'Niveau Or',            icon: '🥇', description: "Atteins 1000 points d'énergie mentale",         condition: { type: 'points',          threshold: 1000}, order: 9 },
  { id: 'points_5000',    name: 'Légende',              icon: '👑', description: "Atteins 5000 points",                           condition: { type: 'points',          threshold: 5000}, order: 10 },
];

// ─── Stress Factors ───────────────────────────────────────────────────────────
const stressFactors = [
  { id: 'exams',       label: 'Examens',            emoji: '📚', category: 'academic',  order: 1 },
  { id: 'homework',    label: 'Devoirs',             emoji: '✏️', category: 'academic',  order: 2 },
  { id: 'deadline',    label: 'Délais',              emoji: '⏰', category: 'academic',  order: 3 },
  { id: 'loneliness',  label: 'Solitude',            emoji: '🌙', category: 'social',    order: 4 },
  { id: 'conflict',    label: 'Conflits',            emoji: '⚡', category: 'social',    order: 5 },
  { id: 'family',      label: 'Famille',             emoji: '🏠', category: 'social',    order: 6 },
  { id: 'sleep',       label: 'Manque de sommeil',   emoji: '😴', category: 'health',    order: 7 },
  { id: 'health',      label: 'Santé',               emoji: '🏥', category: 'health',    order: 8 },
  { id: 'money',       label: 'Argent',              emoji: '💰', category: 'financial', order: 9 },
  { id: 'future',      label: 'Avenir incertain',    emoji: '🔮', category: 'personal',  order: 10 },
  { id: 'motivation',  label: 'Manque de motivation',emoji: '🔋', category: 'personal',  order: 11 },
  { id: 'other',       label: 'Autre',               emoji: '💭', category: 'other',     order: 12 },
];

// ─── Daily Messages ───────────────────────────────────────────────────────────
const dailyMessages = [
  { text: "Chaque jour est une nouvelle chance de prendre soin de toi.",              emoji: '🌱', category: 'wellbeing'   },
  { text: "Tu n'es pas seul(e). Des milliers de jeunes vivent les mêmes défis.",      emoji: '💙', category: 'motivation'  },
  { text: "Prendre soin de sa santé mentale, c'est aussi travailler son avenir.",     emoji: '✨', category: 'motivation'  },
  { text: "Une petite pause vaut mieux qu'un grand épuisement.",                       emoji: '🌿', category: 'wellbeing'   },
  { text: "Le courage, c'est aussi demander de l'aide quand on en a besoin.",         emoji: '🤝', category: 'courage'     },
  { text: "Tes efforts d'aujourd'hui construisent ton succès de demain.",             emoji: '🚀', category: 'motivation'  },
  { text: "Respire. Tu gères mieux que tu ne le crois.",                               emoji: '💪', category: 'wellbeing'   },
  { text: "La bienveillance envers toi-même est le premier pas vers le changement.",  emoji: '💫', category: 'gratitude'   },
  { text: "Chaque petit progrès compte. Célèbre tes victoires du quotidien.",         emoji: '🎯', category: 'motivation'  },
  { text: "Ton bien-être est une priorité, pas un luxe.",                              emoji: '🌸', category: 'wellbeing'   },
  { text: "Les émotions difficiles sont temporaires. Elles passent.",                  emoji: '🌈', category: 'courage'     },
  { text: "Aujourd'hui, choisis une chose qui te fait du bien.",                       emoji: '☀️', category: 'wellbeing'   },
];

// ─── Wellness Tips ────────────────────────────────────────────────────────────
const wellnessTips = [
  // Stressed
  { moodId: 'stressed', emoji: '🌬️', title: 'Respiration 4-7-8',    description: 'Expire le stress en 3 minutes',               actionPath: '/challenges', order: 1 },
  { moodId: 'stressed', emoji: '✍️', title: 'Vide ton esprit',       description: 'Écris tes pensées pour les libérer',           actionPath: null,          order: 2 },
  { moodId: 'stressed', emoji: '🎵', title: 'Pause musicale',        description: 'Écoute quelque chose qui te détend',           actionPath: null,          order: 3 },
  { moodId: 'stressed', emoji: '🚶', title: 'Marche 10 min',         description: 'Sors, même juste dans le couloir',             actionPath: null,          order: 4 },
  // Anxious
  { moodId: 'anxious',  emoji: '🌬️', title: 'Respiration carrée',   description: 'Stabilise ton système nerveux',                actionPath: '/challenges', order: 1 },
  { moodId: 'anxious',  emoji: '👁️', title: 'Méthode 5-4-3-2-1',    description: 'Nomme 5 choses autour de toi',                 actionPath: null,          order: 2 },
  { moodId: 'anxious',  emoji: '💧', title: "Bois de l'eau",         description: 'Simple mais vraiment efficace',                actionPath: null,          order: 3 },
  { moodId: 'anxious',  emoji: '🤝', title: 'Parle à quelqu\'un',    description: 'Partage dans la communauté anonyme',           actionPath: '/community',  order: 4 },
  // Tired
  { moodId: 'tired',    emoji: '😴', title: 'Micro-sieste 20 min',   description: 'Recharge sans perturber la nuit',              actionPath: null,          order: 1 },
  { moodId: 'tired',    emoji: '🧘', title: 'Relaxation guidée',     description: 'Scan corporel de 5 minutes',                  actionPath: '/challenges', order: 2 },
  { moodId: 'tired',    emoji: '🍎', title: 'Collation saine',       description: "Le cerveau a besoin d'énergie",               actionPath: null,          order: 3 },
  { moodId: 'tired',    emoji: '📱', title: 'Déconnecte 30 min',     description: "Les écrans épuisent sans qu'on le remarque",   actionPath: null,          order: 4 },
  // Sad
  { moodId: 'sad',      emoji: '🤝', title: "Tu n'es pas seul(e)",   description: 'La communauté est là pour toi',               actionPath: '/community',  order: 1 },
  { moodId: 'sad',      emoji: '🙏', title: 'Gratitude minute',      description: 'Une seule chose positive suffit',             actionPath: null,          order: 2 },
  { moodId: 'sad',      emoji: '🌬️', title: 'Respire doucement',    description: 'La respiration calme les émotions',           actionPath: '/challenges', order: 3 },
  { moodId: 'sad',      emoji: '📞', title: 'Appelle quelqu\'un',    description: 'Un proche, même juste pour parler',           actionPath: null,          order: 4 },
  // Neutral
  { moodId: 'neutral',  emoji: '🎯', title: 'Pose 3 objectifs',      description: 'Petits, concrets, pour aujourd\'hui',         actionPath: null,          order: 1 },
  { moodId: 'neutral',  emoji: '🙏', title: 'Journal de gratitude',  description: '3 choses positives de ta journée',            actionPath: null,          order: 2 },
  { moodId: 'neutral',  emoji: '🧘', title: 'Méditation 5 min',      description: 'Idéal pour rester centré(e)',                 actionPath: '/challenges', order: 3 },
  { moodId: 'neutral',  emoji: '👥', title: 'Soutiens un pair',      description: "Un mot d'encouragement fait beaucoup",       actionPath: '/community',  order: 4 },
  // Good
  { moodId: 'good',     emoji: '🎉', title: 'Partage ton énergie',   description: 'Encourage quelqu\'un dans la communauté',     actionPath: '/community',  order: 1 },
  { moodId: 'good',     emoji: '⚡', title: 'Lance un défi',         description: 'Profite de cette énergie pour progresser',    actionPath: '/challenges', order: 2 },
  { moodId: 'good',     emoji: '📝', title: 'Note ce bon moment',    description: 'Ton journal de gratitude t\'attend',          actionPath: null,          order: 3 },
  { moodId: 'good',     emoji: '🌱', title: 'Aide un proche',        description: 'Ta bonne humeur est contagieuse',             actionPath: null,          order: 4 },
  // Great
  { moodId: 'great',    emoji: '🚀', title: 'Lance un grand défi',   description: 'Tu es au top, profites-en !',                 actionPath: '/challenges', order: 1 },
  { moodId: 'great',    emoji: '💫', title: 'Célèbre tes victoires', description: 'Note ce qui t\'a amené là',                   actionPath: null,          order: 2 },
  { moodId: 'great',    emoji: '🤝', title: 'Sois un mentor',        description: 'Partage ton expérience dans la communauté',   actionPath: '/community',  order: 3 },
  { moodId: 'great',    emoji: '🎯', title: 'Fixe un grand objectif',description: 'Maintenant que tu te sens bien',              actionPath: null,          order: 4 },
];


// ─── Mood Definitions ─────────────────────────────────────────────────────────
const moodDefinitions = [
  { id: 'great',    label: 'Super bien',  emoji: '😄', score: 5, colorHex: '#2ECC71', order: 1 },
  { id: 'good',     label: 'Bien',        emoji: '🙂', score: 4, colorHex: '#27AE60', order: 2 },
  { id: 'neutral',  label: 'Neutre',      emoji: '😐', score: 3, colorHex: '#F5B731', order: 3 },
  { id: 'tired',    label: 'Fatigué(e)',  emoji: '😔', score: 2, colorHex: '#E07B2A', order: 4 },
  { id: 'stressed', label: 'Stressé(e)', emoji: '😰', score: 1, colorHex: '#77021D', order: 5 },
  { id: 'anxious',  label: 'Anxieux(se)',emoji: '😟', score: 1, colorHex: '#C93B2B', order: 6 },
  { id: 'sad',      label: 'Triste',      emoji: '😢', score: 2, colorHex: '#8A7070', order: 7 },
];

// ─── Professional Types ───────────────────────────────────────────────────────
const professionalTypes = [
  { id: 'psychologist', label: 'Psychologue',    labelPlural: 'Psychologues', emoji: '🧠', colorHex: '#77021D', order: 1 },
  { id: 'coach',        label: 'Coach bien-être',labelPlural: 'Coachs',       emoji: '🌱', colorHex: '#E07B2A', order: 2 },
  { id: 'doctor',       label: 'Médecin',         labelPlural: 'Médecins',    emoji: '🩺', colorHex: '#E07B2A', order: 3 },
];


// ─── Challenge Categories ─────────────────────────────────────────────────────
const challengeCategories = [
  { id: 'breathing',  label: 'Respiration', emoji: '🌬️', colorHex: '#77021D', order: 1 },
  { id: 'meditation', label: 'Méditation',  emoji: '🧘', colorHex: '#5B4FCF', order: 2 },
  { id: 'journaling', label: 'Journal',     emoji: '✍️', colorHex: '#E07B2A', order: 3 },
  { id: 'gratitude',  label: 'Gratitude',   emoji: '🙏', colorHex: '#F5B731', order: 4 },
  { id: 'movement',   label: 'Mouvement',   emoji: '🏃', colorHex: '#2ECC71', order: 5 },
  { id: 'social',     label: 'Social',      emoji: '👥', colorHex: '#3498DB', order: 6 },
  { id: 'creativity', label: 'Créativité',  emoji: '🎨', colorHex: '#E84393', order: 7 },
  { id: 'game',       label: 'Mini-jeu',    emoji: '🎮', colorHex: '#9B59B6', order: 8 },
];

// ─── Challenge Difficulties ───────────────────────────────────────────────────
const challengeDifficulties = [
  { id: 'easy',   label: 'Facile',    colorHex: '#6BCF7F', order: 1 },
  { id: 'medium', label: 'Moyen',     colorHex: '#FFD93D', order: 2 },
  { id: 'hard',   label: 'Difficile', colorHex: '#FF7675', order: 3 },
];

// ─── Post Types ───────────────────────────────────────────────────────────────
const postTypes = [
  { id: 'feeling',             label: 'Je ressens', emoji: '💬', colorHex: '#77021D', isLegacy: false, order: 1 },
  { id: 'question',            label: 'Question',   emoji: '❓', colorHex: '#E07B2A', isLegacy: false, order: 2 },
  { id: 'support',             label: 'Soutien',    emoji: '🤝', colorHex: '#F5B731', isLegacy: false, order: 3 },
  { id: 'success',             label: 'Réussite',   emoji: '🎉', colorHex: '#E07B2A', isLegacy: false, order: 4 },
  { id: 'tip',                 label: 'Conseil',    emoji: '💡', colorHex: '#C93B2B', isLegacy: false, order: 5 },
  { id: 'general',             label: 'Partage',    emoji: '💬', colorHex: '#77021D', isLegacy: true,  order: 6 },
  { id: 'mood_share',          label: 'Humeur',     emoji: '😊', colorHex: '#E07B2A', isLegacy: true,  order: 7 },
  { id: 'achievement',         label: 'Réussite',   emoji: '🏆', colorHex: '#E07B2A', isLegacy: true,  order: 8 },
  { id: 'challenge_completed', label: 'Défi',       emoji: '✅', colorHex: '#F5B731', isLegacy: true,  order: 9 },
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/linkmind')
  .then(async () => {
    await Badge.deleteMany({});
    await MoodDefinition.deleteMany({});
    await ProfessionalType.deleteMany({});
    await ChallengeCategory.deleteMany({});
    await ChallengeDifficulty.deleteMany({});
    await PostType.deleteMany({});
    await StressFactor.deleteMany({});
    await DailyMessage.deleteMany({});
    await WellnessTip.deleteMany({});

    await MoodDefinition.insertMany(moodDefinitions);
    await ProfessionalType.insertMany(professionalTypes);
    await ChallengeCategory.insertMany(challengeCategories);
    await ChallengeDifficulty.insertMany(challengeDifficulties);
    await PostType.insertMany(postTypes);
    await Badge.insertMany(badges);
    await StressFactor.insertMany(stressFactors);
    await DailyMessage.insertMany(dailyMessages);
    await WellnessTip.insertMany(wellnessTips);

    console.log(`✅ ${moodDefinitions.length} humeurs`);
    console.log(`✅ ${challengeCategories.length} catégories défis`);
    console.log(`✅ ${challengeDifficulties.length} difficultés`);
    console.log(`✅ ${postTypes.length} types de posts`);
    console.log(`✅ ${professionalTypes.length} types de professionnels`);
    console.log(`✅ ${badges.length} badges`);
    console.log(`✅ ${stressFactors.length} facteurs de stress`);
    console.log(`✅ ${dailyMessages.length} messages du jour`);
    console.log(`✅ ${wellnessTips.length} wellness tips`);
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });