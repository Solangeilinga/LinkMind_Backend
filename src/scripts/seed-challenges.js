/**
 * Seed script — populates the Challenge collection with initial data.
 * Run: node src/scripts/seed-challenges.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Challenge } = require('../models/challenge.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linkmind';

const challenges = [
  // ── BREATHING ────────────────────────────────────────────────────
  {
    title: 'Respiration 4-7-8',
    description: 'Expire le stress avec cette technique ancienne et efficace.',
    instructions: [
      'Expire complètement par la bouche',
      'Inspire par le nez pendant 4 secondes',
      'Retiens ta respiration pendant 7 secondes',
      'Expire lentement par la bouche pendant 8 secondes',
      'Répète 4 cycles',
    ],
    category: 'breathing',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 15,
    icon: '🌬️',
    targetMoods: ['stressed', 'anxious'],
    isActive: true,
  },
  {
    title: 'Respiration carrée',
    description: 'Stabilise ton système nerveux avec la cohérence cardiaque.',
    instructions: [
      'Inspire pendant 4 secondes',
      'Retiens pendant 4 secondes',
      'Expire pendant 4 secondes',
      'Retiens pendant 4 secondes',
      'Répète 6 cycles',
    ],
    category: 'breathing',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 15,
    icon: '⬜',
    targetMoods: ['stressed', 'anxious', 'neutral'],
    isActive: true,
  },
  {
    title: 'Respiration abdominale',
    description: 'Apprends à respirer profondément pour calmer le corps.',
    instructions: [
      'Pose une main sur le ventre, une sur la poitrine',
      'Inspire en gonflant le ventre (pas la poitrine)',
      'Expire lentement en rentrant le ventre',
      'Répète 10 fois en conscience',
    ],
    category: 'breathing',
    difficulty: 'easy',
    durationMinutes: 3,
    points: 10,
    icon: '💨',
    targetMoods: ['tired', 'sad', 'stressed'],
    isActive: true,
  },

  // ── MEDITATION ───────────────────────────────────────────────────
  {
    title: 'Scan corporel 5 minutes',
    description: 'Parcours ton corps de la tête aux pieds pour relâcher les tensions.',
    instructions: [
      'Allonge-toi ou assieds-toi confortablement',
      'Ferme les yeux et respire naturellement',
      'Concentre-toi sur tes pieds — sens les sensations',
      'Remonte lentement : jambes, ventre, poitrine, bras, tête',
      'À chaque zone, relâche consciemment la tension',
    ],
    category: 'meditation',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 15,
    icon: '🧘',
    targetMoods: ['tired', 'stressed', 'anxious'],
    isActive: true,
  },
  {
    title: 'Pleine conscience 10 min',
    description: 'Observe tes pensées sans jugement pendant 10 minutes.',
    instructions: [
      'Assieds-toi dans un endroit calme',
      'Pose les mains sur les genoux',
      'Focalise ton attention sur ta respiration',
      'Quand une pensée arrive, observe-la sans la suivre',
      'Ramène doucement ton attention à la respiration',
    ],
    category: 'meditation',
    difficulty: 'medium',
    durationMinutes: 10,
    points: 25,
    icon: '🌿',
    targetMoods: ['neutral', 'good'],
    isActive: true,
  },

  // ── JOURNALING ───────────────────────────────────────────────────
  {
    title: 'Vide mental express',
    description: 'Écris tout ce qui te pèse l\'esprit sans filtre pendant 5 minutes.',
    instructions: [
      'Prends une feuille ou ton téléphone',
      'Mets un timer de 5 minutes',
      'Écris tout ce qui te passe par la tête sans t\'arrêter',
      'Ne relis pas, ne corrige pas — laisse couler',
      'À la fin, froisse la feuille ou efface le texte si tu veux',
    ],
    category: 'journaling',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 10,
    icon: '✍️',
    targetMoods: ['stressed', 'anxious', 'sad'],
    isActive: true,
  },
  {
    title: '3 choses positives',
    description: 'Note 3 moments positifs d\'aujourd\'hui, aussi petits soient-ils.',
    instructions: [
      'Prends un moment calme',
      'Pense à ta journée',
      'Écris 3 choses positives, même minimes (un sourire, un repas, un compliment)',
      'Pour chacune, écris pourquoi elle compte pour toi',
    ],
    category: 'gratitude',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 10,
    icon: '🙏',
    targetMoods: ['sad', 'neutral', 'tired'],
    isActive: true,
  },
  {
    title: 'Lettre à toi-même',
    description: 'Écris une lettre bienveillante à la version de toi qui souffre.',
    instructions: [
      'Commence par "Cher(e) [ton prénom]..."',
      'Décris ce que tu ressens en ce moment',
      'Écris ce que tu dirais à un ami dans la même situation',
      'Termine par une phrase d\'encouragement sincère',
    ],
    category: 'journaling',
    difficulty: 'medium',
    durationMinutes: 10,
    points: 20,
    icon: '💌',
    targetMoods: ['sad', 'anxious', 'tired'],
    isActive: true,
  },

  // ── GRATITUDE ────────────────────────────────────────────────────
  {
    title: 'Gratitude minute',
    description: 'Exprime de la gratitude pour une chose dans ta vie en ce moment.',
    instructions: [
      'Ferme les yeux 30 secondes',
      'Pense à une personne ou chose pour laquelle tu es reconnaissant(e)',
      'Ressens vraiment cette gratitude dans ta poitrine',
      'Si c\'est une personne, envoie-lui un message court',
    ],
    category: 'gratitude',
    difficulty: 'easy',
    durationMinutes: 2,
    points: 10,
    icon: '💛',
    targetMoods: ['neutral', 'sad', 'tired'],
    isActive: true,
  },

  // ── MOVEMENT ─────────────────────────────────────────────────────
  {
    title: 'Marche consciente 10 min',
    description: 'Marche lentement en observant chaque pas et ton environnement.',
    instructions: [
      'Sors ou trouve un couloir',
      'Marche à vitesse normale, sans téléphone',
      'Observe ce que tu vois, entends, ressens',
      'Si une pensée arrive, reconnecte-toi aux sensations physiques',
    ],
    category: 'movement',
    difficulty: 'easy',
    durationMinutes: 10,
    points: 15,
    icon: '🚶',
    targetMoods: ['stressed', 'tired', 'sad'],
    isActive: true,
  },
  {
    title: 'Étirements anti-stress',
    description: '5 étirements simples pour libérer les tensions accumulées.',
    instructions: [
      'Roulement des épaules : 10x vers l\'avant, 10x vers l\'arrière',
      'Étirement du cou : incliner la tête de chaque côté, tenir 15s',
      'Rotation du dos assis : tourner le buste à gauche puis à droite',
      'Extension des bras : lever les bras, s\'étirer vers le haut',
      'Respire profondément entre chaque exercice',
    ],
    category: 'movement',
    difficulty: 'easy',
    durationMinutes: 7,
    points: 15,
    icon: '🤸',
    targetMoods: ['stressed', 'tired', 'neutral'],
    isActive: true,
  },

  // ── SOCIAL ───────────────────────────────────────────────────────
  {
    title: 'Message d\'encouragement',
    description: 'Envoie un message positif à quelqu\'un que tu n\'as pas contacté récemment.',
    instructions: [
      'Pense à un ami, camarade ou membre de ta famille',
      'Écris un message sincère de 2-3 phrases',
      'Pas besoin d\'occasion — juste dire que tu penses à eux',
      'Envoie-le !',
    ],
    category: 'social',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 15,
    icon: '💬',
    targetMoods: ['good', 'great', 'neutral'],
    isActive: true,
  },
  {
    title: 'Partage dans la communauté',
    description: 'Partage une expérience ou encourage un autre étudiant anonymement.',
    instructions: [
      'Ouvre l\'onglet Communauté',
      'Lis 2-3 publications récentes',
      'Laisse un commentaire bienveillant ou encourageant',
      'Ou partage ton propre vécu anonymement',
    ],
    category: 'social',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 10,
    icon: '🤝',
    targetMoods: ['neutral', 'good', 'great'],
    isActive: true,
  },

  // ── CREATIVITY ───────────────────────────────────────────────────
  {
    title: 'Dessin libre 5 min',
    description: 'Dessine ce que tu ressens sans te soucier du résultat.',
    instructions: [
      'Prends une feuille et un crayon',
      'Pas de contrainte — cercles, lignes, gribouillages, tout est permis',
      'Laisse ta main bouger librement pendant 5 minutes',
      'Observe ce qui est sorti sans jugement',
    ],
    category: 'creativity',
    difficulty: 'easy',
    durationMinutes: 5,
    points: 10,
    icon: '🎨',
    targetMoods: ['stressed', 'sad', 'neutral'],
    isActive: true,
  },

  // ── CHALLENGES AVANCÉS ───────────────────────────────────────────
  {
    title: 'Défi Pomodoro étudiant',
    description: 'Travaille 25 minutes sans distraction, puis pause 5 minutes.',
    instructions: [
      'Choisis UNE tâche à faire',
      'Mets ton téléphone en mode silencieux',
      'Travaille pendant 25 minutes sans interruption',
      'Prends une pause de 5 minutes',
      'Répète 4 cycles puis pause longue de 20 min',
    ],
    category: 'game',
    difficulty: 'medium',
    durationMinutes: 30,
    points: 30,
    icon: '🍅',
    targetMoods: ['neutral', 'good', 'great'],
    isActive: true,
  },
  {
    title: 'Déconnexion numérique 1h',
    description: 'Passe 1 heure sans réseaux sociaux ni distractions digitales.',
    instructions: [
      'Coupe les notifications',
      'Mets ton téléphone dans une autre pièce ou face retournée',
      'Utilise ce temps pour lire, marcher, ou te reposer',
      'Note comment tu te sens après',
    ],
    category: 'game',
    difficulty: 'hard',
    durationMinutes: 60,
    points: 40,
    icon: '📵',
    targetMoods: ['stressed', 'tired', 'neutral'],
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Clear existing challenges
    const deleted = await Challenge.deleteMany({});
    console.log(`🗑️  ${deleted.deletedCount} défis supprimés`);

    // Insert new ones
    const inserted = await Challenge.insertMany(challenges);
    console.log(`✅ ${inserted.length} défis insérés`);

    // Summary by category
    const categories = {};
    inserted.forEach(c => {
      categories[c.category] = (categories[c.category] || 0) + 1;
    });
    console.log('\n📊 Résumé par catégorie :');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} défi(s)`);
    });

    console.log('\n🎉 Seed terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur seed:', error.message);
    process.exit(1);
  }
}

seed();