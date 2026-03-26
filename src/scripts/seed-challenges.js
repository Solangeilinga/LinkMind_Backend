// Défis de base
const challenges = [
  // 1. Défi avec timer
  {
    title: "Respiration 4-7-8",
    description: "Une technique de respiration apaisante pour réduire le stress et l'anxiété",
    icon: "🌬️",
    category: "breathing",
    difficulty: "easy",
    completionType: {
      type: "timer",
      config: {
        stepDuration: 8,
        totalDuration: 120,
        stepsCount: 4
      }
    },
    points: 50,
    instructions: [
      "Inspire profondément par le nez pendant 4 secondes",
      "Retiens ta respiration pendant 7 secondes",
      "Expire lentement par la bouche pendant 8 secondes",
      "Répète l'exercice 3 fois"
    ],
    moodTags: ["stress", "anxiety", "calm"]
  },
  
  // 2. Défi d'action simple
  {
    title: "Publier un message positif",
    description: "Partage quelque chose de positif dans la communauté",
    icon: "💬",
    category: "social",
    difficulty: "easy",
    completionType: {
      type: "action",
      config: {
        validationEndpoint: "/community/posts",
        checkUserAction: true,
        targetType: "post"
      }
    },
    points: 75,
    instructions: [
      "Va dans l'onglet Communauté",
      "Clique sur le bouton 'Partager'",
      "Écris un message inspirant ou un conseil",
      "Publie ton post"
    ],
    moodTags: ["happy", "motivated"]
  },
  
  // 3. Défi de réflexion
  {
    title: "Journal de gratitude",
    description: "Prends un moment pour apprécier les bonnes choses de ta vie",
    icon: "🙏",
    category: "gratitude",
    difficulty: "easy",
    completionType: {
      type: "reflection",
      config: {
        requiresInput: true,
        minWords: 10,
        inputPlaceholder: "Écris 3 choses pour lesquelles tu es reconnaissant aujourd'hui..."
      }
    },
    points: 100,
    instructions: [
      "Prends un moment calme",
      "Pense à 3 choses positives de ta journée",
      "Note-les et explique pourquoi elles comptent"
    ],
    moodTags: ["gratitude", "calm", "happy"]
  },
  
  // 4. Défi social
  {
    title: "Soutenir un membre",
    description: "Apporte du soutien à un autre membre de la communauté",
    icon: "🤝",
    category: "social",
    difficulty: "medium",
    completionType: {
      type: "social",
      config: {
        requiresInteraction: true,
        targetType: "comment",
        validationEndpoint: "/community/interactions"
      }
    },
    points: 80,
    instructions: [
      "Trouve un post dans la communauté",
      "Laisse un commentaire encourageant",
      "Ou utilise la réaction 'Moi aussi' sur un post"
    ],
    moodTags: ["support", "connection"]
  },
  
  // 5. Défi de mouvement
  {
    title: "5 minutes d'étirements",
    description: "Bouge ton corps pour relâcher les tensions",
    icon: "🧘",
    category: "movement",
    difficulty: "easy",
    completionType: {
      type: "timer",
      config: {
        stepDuration: 60,
        totalDuration: 300,
        stepsCount: 5
      }
    },
    points: 60,
    instructions: [
      "Étire ton cou doucement (1 min)",
      "Étire tes épaules (1 min)",
      "Étire ton dos (1 min)",
      "Étire tes jambes (1 min)",
      "Respire profondément (1 min)"
    ],
    moodTags: ["stress", "fatigue", "energy"]
  },
  
  // 6. Défi d'exploration
  {
    title: "Découvrir un professionnel",
    description: "Explore les professionnels disponibles",
    icon: "🩺",
    category: "exploration",
    difficulty: "easy",
    completionType: {
      type: "exploration",
      config: {
        targetScreen: "professionals",
        validationEndpoint: "/professionals/view",
        checkUserAction: true
      }
    },
    points: 50,
    instructions: [
      "Va dans l'onglet Professionnels",
      "Consulte le profil d'au moins un psychologue",
      "Regarde ses disponibilités et spécialités"
    ],
    moodTags: ["curious", "seeking_help"]
  },
  
  // 7. Défi créatif
  {
    title: "Dessiner ses émotions",
    description: "Exprime ce que tu ressens par le dessin",
    icon: "🎨",
    category: "creativity",
    difficulty: "medium",
    completionType: {
      type: "reflection",
      config: {
        requiresInput: true,
        inputPlaceholder: "Décris ce que tu as dessiné et ce que ça représente pour toi...",
        minWords: 5
      }
    },
    points: 120,
    instructions: [
      "Prends une feuille et un crayon",
      "Dessine ce que tu ressens en ce moment",
      "Pas besoin d'être artiste, exprime-toi librement",
      "Décris brièvement ton dessin"
    ],
    moodTags: ["creative", "emotional"]
  },
  
  // 8. Défi de méditation
  {
    title: "Méditation 5 minutes",
    description: "Calme ton esprit avec une courte méditation guidée",
    icon: "🧘‍♀️",
    category: "meditation",
    difficulty: "medium",
    completionType: {
      type: "timer",
      config: {
        stepDuration: 60,
        totalDuration: 300,
        stepsCount: 5
      }
    },
    points: 90,
    instructions: [
      "Assieds-toi confortablement",
      "Ferme les yeux et respire calmement (1 min)",
      "Observe tes pensées sans jugement (1 min)",
      "Concentre-toi sur ta respiration (1 min)",
      "Ramasse doucement ton attention (1 min)",
      "Ouvre les yeux en douceur (1 min)"
    ],
    moodTags: ["stress", "anxiety", "overwhelmed"]
  }
];

// Catégories
const challengeCategories = [
  { id: "breathing", label: "Respiration", labelPlural: "Respiration", emoji: "🌬️", color: "#6C5CE7", order: 1 },
  { id: "meditation", label: "Méditation", labelPlural: "Méditation", emoji: "🧘", color: "#A66ADE", order: 2 },
  { id: "gratitude", label: "Gratitude", labelPlural: "Gratitude", emoji: "🙏", color: "#00B894", order: 3 },
  { id: "movement", label: "Mouvement", labelPlural: "Mouvement", emoji: "🏃", color: "#FDCB6E", order: 4 },
  { id: "social", label: "Social", labelPlural: "Social", emoji: "👥", color: "#E84393", order: 5 },
  { id: "creativity", label: "Créativité", labelPlural: "Créativité", emoji: "🎨", color: "#FF7675", order: 6 },
  { id: "exploration", label: "Exploration", labelPlural: "Exploration", emoji: "🔍", color: "#74B9FF", order: 7 },
  { id: "reflection", label: "Réflexion", labelPlural: "Réflexion", emoji: "💭", color: "#55EFC4", order: 8 }
];

// Difficultés
const challengeDifficulties = [
  { id: "easy", label: "Facile", color: "#6BCF7F", pointsMultiplier: 1, order: 1 },
  { id: "medium", label: "Moyen", color: "#FFD93D", pointsMultiplier: 1.5, order: 2 },
  { id: "hard", label: "Difficile", color: "#FF7675", pointsMultiplier: 2, order: 3 }
];

module.exports = { challenges, challengeCategories, challengeDifficulties };