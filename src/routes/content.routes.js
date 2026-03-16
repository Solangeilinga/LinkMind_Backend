// content.routes.js — static mental health resources
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// GET /api/content/resources
router.get('/resources', (req, res) => {
  res.json({
    resources: [
      {
        id: 'breathing_box',
        title: 'Respiration carrée',
        description: 'Technique pour réduire le stress immédiatement',
        type: 'exercise',
        category: 'breathing',
        steps: ['Expire complètement', 'Inspire sur 4 secondes', 'Retiens sur 4 secondes', 'Expire sur 4 secondes', 'Retiens sur 4 secondes', 'Répète 4 fois'],
        durationMinutes: 5,
      },
      {
        id: 'body_scan',
        title: 'Scan corporel',
        description: 'Relaxation progressive de la tête aux pieds',
        type: 'meditation',
        category: 'meditation',
        steps: ['Allonge-toi ou assieds-toi confortablement', 'Ferme les yeux, respire profondément', 'Focus sur le sommet de la tête, relâche les tensions', 'Descends progressivement vers le cou, les épaules...', 'Continue jusqu\'aux pieds'],
        durationMinutes: 10,
      },
      {
        id: 'pomodoro_study',
        title: 'Technique Pomodoro étudiant',
        description: 'Optimise ton efficacité et réduit l\'anxiété des révisions',
        type: 'productivity',
        category: 'study',
        steps: ['25 minutes de travail concentré', '5 minutes de pause active (étire-toi, marche)', 'Après 4 cycles : pause de 20-30 minutes', 'Éloigne le téléphone pendant les cycles'],
        durationMinutes: 25,
      },
      {
        id: 'exam_anxiety',
        title: 'Gérer l\'anxiété des examens',
        description: 'Stratégies éprouvées avant et pendant les examens',
        type: 'guide',
        category: 'anxiety',
        tips: [
          'La veille : dors 7-8h, révise légèrement, prépare ton matériel',
          'Le matin : petit-déjeuner équilibré, arrive 15 min en avance',
          'Pendant : lis tout avant de commencer, commence par ce que tu maîtrises',
          'Si panique : respire 3 fois profondément, repose ton stylo 30 secondes',
        ],
      },
    ],
  });
});

module.exports = router;
