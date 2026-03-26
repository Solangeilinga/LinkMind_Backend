require('dotenv').config();
const mongoose = require('mongoose');
const AppConfig = require('../models/app-config.model');
const { ReportTemplate, AssistantStarter } = require('../models/config.model');

const configs = [
  // Premium
  { key: 'mindo_daily_limit',      value: 10,    type: 'number',  description: 'Nb messages Mindo/jour (freemium)' },
  { key: 'premium_price_monthly',  value: 2500,  type: 'number',  description: 'Prix mensuel Premium en FCFA' },
  { key: 'premium_price_yearly',   value: 18000, type: 'number',  description: 'Prix annuel Premium en FCFA' },
  { key: 'commission_rate',        value: 10,    type: 'number',  description: 'Commission LinkMind sur réservations (%)' },
  { key: 'ad_frequency',          value: 5,     type: 'number',  description: 'Nb posts entre chaque pub communauté' },
  { key: 'app_name',              value: 'LinkMind', type: 'string', description: "Nom de l'app" },
  { key: 'support_email',         value: 'support@linkmind.app', type: 'string', description: 'Email support' },
  { key: 'support_whatsapp',      value: '+22600000000', type: 'string', description: 'WhatsApp support' },
];

const reportTemplates = [
  {
    moodRange: 'high',    // avgScore >= 4
    title: 'Période positive',
    conseil: "Tu traverses une belle période ! Continue à prendre soin de toi avec tes défis quotidiens et reste actif(e) dans la communauté. Partage ton énergie positive avec les autres.",
    emoji: '🌟',
  },
  {
    moodRange: 'medium',  // avgScore >= 3
    title: 'Équilibre correct',
    conseil: "Tu maintiens un équilibre correct. Quelques défis de respiration ou de gratitude pourraient t'aider à renforcer ton bien-être. N'hésite pas à partager dans la communauté.",
    emoji: '🌱',
  },
  {
    moodRange: 'low',     // avgScore < 3
    title: 'Période difficile',
    conseil: "Cette période semble difficile. Pense à pratiquer les exercices de respiration régulièrement et à parler à quelqu'un de confiance. Mindo est disponible pour t'écouter à tout moment.",
    emoji: '💙',
  },
];

const assistantStarters = [
  { emoji: '😰', text: "Je suis stressé(e) par mes examens",     context: 'stressed', order: 1 },
  { emoji: '😔', text: "Je me sens seul(e)",                       context: 'sad',      order: 2 },
  { emoji: '😴', text: "Je n'arrive plus à me concentrer",         context: 'tired',    order: 3 },
  { emoji: '💭', text: "J'ai du mal à me motiver",                 context: 'neutral',  order: 4 },
  { emoji: '😟', text: "J'ai des pensées qui me pèsent",           context: 'anxious',  order: 5 },
  { emoji: '🎯', text: "Comment mieux organiser mes révisions ?",  context: 'neutral',  order: 6 },
  { emoji: '🌙', text: "Je dors mal en ce moment",                 context: 'tired',    order: 7 },
  { emoji: '🤝', text: "J'ai besoin de parler à quelqu'un",        context: 'sad',      order: 8 },
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/linkmind')
  .then(async () => {
    await AppConfig.deleteMany({});
    await ReportTemplate.deleteMany({});
    await AssistantStarter.deleteMany({});

    await AppConfig.insertMany(configs);
    await ReportTemplate.insertMany(reportTemplates);
    await AssistantStarter.insertMany(assistantStarters);

    console.log(`✅ ${configs.length} configs app`);
    console.log(`✅ ${reportTemplates.length} templates rapport PDF`);
    console.log(`✅ ${assistantStarters.length} starters Mindo`);
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });