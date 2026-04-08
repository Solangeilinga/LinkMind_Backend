const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connecté à MongoDB\n');

    // Récupérer les modèles
    const User = require('../models/user.model');
    const Post = require('../models/community.model').Post;
    const Comment = require('../models/community.model').Comment;
    const Notification = require('../models/notification.model');
    const GroupChallenge = require('../models/community.model').GroupChallenge;

    // ✅ Ajouter UNIQUEMENT les index qui n'existent pas encore
    console.log('🔧 Ajout des index manquants...\n');

    // Post indexes
    console.log('📝 Post indexes:');
    await Post.collection.createIndex({ createdAt: -1 }).catch(() => console.log('   - createdAt index existe déjà'));
    await Post.collection.createIndex({ author: 1, createdAt: -1 }).catch(() => console.log('   - author+createdAt index existe déjà'));
    await Post.collection.createIndex({ postType: 1, createdAt: -1 }).catch(() => console.log('   - postType+createdAt index existe déjà'));
    await Post.collection.createIndex({ isVisible: 1, createdAt: -1 }).catch(() => console.log('   - isVisible+createdAt index existe déjà'));
    console.log('');

    // Comment indexes
    console.log('💬 Comment indexes:');
    await Comment.collection.createIndex({ post: 1, createdAt: 1 }).catch(() => console.log('   - post+createdAt index existe déjà'));
    await Comment.collection.createIndex({ post: 1, parentComment: 1 }).catch(() => console.log('   - post+parentComment index existe déjà'));
    await Comment.collection.createIndex({ author: 1, createdAt: -1 }).catch(() => console.log('   - author+createdAt index existe déjà'));
    console.log('');

    // Notification indexes
    console.log('🔔 Notification indexes:');
    await Notification.collection.createIndex({ recipient: 1, createdAt: -1 }).catch(() => console.log('   - recipient+createdAt index existe déjà'));
    await Notification.collection.createIndex({ recipient: 1, isRead: 1 }).catch(() => console.log('   - recipient+isRead index existe déjà'));
    console.log('');

    // GroupChallenge indexes
    console.log('🏆 GroupChallenge indexes:');
    await GroupChallenge.collection.createIndex({ endDate: 1, isActive: 1 }).catch(() => console.log('   - endDate+isActive index existe déjà'));
    await GroupChallenge.collection.createIndex({ startDate: 1 }).catch(() => console.log('   - startDate index existe déjà'));
    console.log('');

    console.log('🎉 Tous les index ont été vérifiés/ajoutés !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

createIndexes();