require('dotenv').config();
const mongoose = require('mongoose');
const Professional = require('../models/professional.model');

const professionals = [
  {
    firstName: 'Aminata', lastName: 'Ouédraogo', title: 'Dr.',
    type: 'psychologist',
    specialties: ['Anxiété', 'Dépression', 'Stress', 'Étudiants'],
    bio: 'Psychologue clinicienne avec 8 ans d\'expérience, spécialisée dans l\'accompagnement des jeunes adultes et étudiants. Approche bienveillante et centrée sur la personne.',
    city: 'Ouagadougou', country: 'Burkina Faso',
    phone: '+22670000001', whatsapp: '+22670000001',
    email: 'aminata.psy@example.com',
    sessionPrice: 15000, sessionDuration: 60,
    isOnline: true, isInPerson: true,
    languages: ['Français', 'Moore'],
    isVerified: true, isActive: true, rating: 4.8, reviewCount: 24,
  },
  {
    firstName: 'Koffi', lastName: 'Mensah', title: 'Coach',
    type: 'coach',
    specialties: ['Confiance en soi', 'Motivation', 'Gestion du temps', 'Orientation'],
    bio: 'Coach certifié ICF, j\'aide les jeunes à trouver leur voie et à développer leur potentiel. Séances dynamiques et orientées solutions.',
    city: 'Ouagadougou', country: 'Burkina Faso',
    phone: '+22675000002', whatsapp: '+22675000002',
    sessionPrice: 10000, sessionDuration: 45,
    isOnline: true, isInPerson: true,
    languages: ['Français'],
    isVerified: true, isActive: true, rating: 4.6, reviewCount: 18,
  },
  {
    firstName: 'Fatoumata', lastName: 'Diallo', title: 'Dr.',
    type: 'doctor',
    specialties: ['Médecine générale', 'Santé mentale', 'Burn-out', 'Troubles du sommeil'],
    bio: 'Médecin généraliste avec une formation complémentaire en santé mentale. Je prends en charge les aspects médicaux et psychologiques du bien-être.',
    city: 'Bobo-Dioulasso', country: 'Burkina Faso',
    phone: '+22676000003',
    sessionPrice: 12000, sessionDuration: 30,
    isOnline: true, isInPerson: true,
    languages: ['Français', 'Dioula'],
    isVerified: true, isActive: true, rating: 4.9, reviewCount: 31,
  },
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/linkmind')
  .then(async () => {
    await Professional.deleteMany({});
    await Professional.insertMany(professionals);
    console.log(`✅ ${professionals.length} professionnels ajoutés`);
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });