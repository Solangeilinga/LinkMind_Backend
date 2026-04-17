const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Désactive la création automatique d'index au démarrage
      // pour éviter les conflits avec les index existants (ex: email_1 sparse)
      // Les index sont gérés manuellement via src/scripts/create-indexes.js
      autoIndex: false,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;