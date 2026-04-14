/**
 * MongoDB Indexes Script (idempotent & robuste)
 * Run: npm run db:index
 */
require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Chargement sécurisé des modèles
const models = {
  User: null,
  Mood: null,
  Challenge: null,
  Community: null,
  Content: null,
  Notification: null,
};

try { models.User = require('../models/user.model'); } catch (e) { logger.warn('User.model introuvable'); }
try { models.Mood = require('../models/mood.model'); } catch (e) { logger.warn('Mood.model introuvable'); }
try { models.Challenge = require('../models/challenge.model'); } catch (e) { logger.warn('Challenge.model introuvable'); }
try { models.Community = require('../models/community.model'); } catch (e) { logger.warn('Community.model introuvable'); }
try { models.Content = require('../models/content.model'); } catch (e) { logger.warn('Content.model introuvable'); }
try { models.Notification = require('../models/notification.model'); } catch (e) { logger.warn('Notification.model introuvable'); }

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = {
  success: (msg) => logger.info(`${colors.green}✓${colors.reset} ${msg}`),
  info: (msg) => logger.info(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => logger.warn(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => logger.error(`${colors.red}✗${colors.reset} ${msg}`),
};

async function ensureIndex(collection, indexSpec, options, indexName = null) {
  if (!collection || typeof collection.indexes !== 'function') {
    log.warn(`Collection invalide, index ignoré: ${JSON.stringify(indexSpec)}`);
    return;
  }
  const generatedName = Object.entries(indexSpec)
    .map(([key, value]) => `${key}_${value}`)
    .join('_');
  const targetName = indexName || generatedName;

  const existingIndexes = await collection.indexes();
  const existing = existingIndexes.find(idx => idx.name === targetName);

  if (existing) {
    const opts = options || {};
    const needsRecreate = (
      (!!opts.unique) !== (!!existing.unique) ||
      (!!opts.sparse) !== (!!existing.sparse) ||
      (opts.expireAfterSeconds && existing.expireAfterSeconds !== opts.expireAfterSeconds)
    );
    if (needsRecreate) {
      log.warn(`Index ${targetName} existe avec options incompatibles, suppression...`);
      await collection.dropIndex(targetName);
      await collection.createIndex(indexSpec, options);
      log.success(`Index ${targetName} recréé`);
    } else {
      log.info(`Index ${targetName} existe déjà, skip.`);
    }
  } else {
    await collection.createIndex(indexSpec, options);
    log.success(`Index ${targetName} créé`);
  }
}

async function createIndexes() {
  try {
    log.info('Starting indexes creation...\n');

    if (models.User && models.User.collection) {
      log.info('Creating User indexes...');
      await ensureIndex(models.User.collection, { email: 1 }, { unique: true, sparse: true }, 'email_1');
      await ensureIndex(models.User.collection, { phoneNumber: 1 }, { sparse: true });
      await ensureIndex(models.User.collection, { level: 1 }, {});
      await ensureIndex(models.User.collection, { accountStatus: 1 }, {});
      await ensureIndex(models.User.collection, { createdAt: -1 }, {});
      await ensureIndex(models.User.collection, { pointsHistory: 1 }, { sparse: true });
      log.success('User indexes done\n');
    } else log.warn('Skipping User indexes (model not loaded)');

    if (models.Mood && models.Mood.collection) {
      log.info('Creating Mood indexes...');
      await ensureIndex(models.Mood.collection, { user: 1, createdAt: -1 }, {});
      await ensureIndex(models.Mood.collection, { score: 1 }, {});
      await ensureIndex(models.Mood.collection, { label: 1 }, {});
      await ensureIndex(models.Mood.collection, { createdAt: -1 }, {});
      await ensureIndex(models.Mood.collection, { factors: 1 }, { sparse: true });
      await ensureIndex(models.Mood.collection, { createdAt: 1 }, { expireAfterSeconds: 7776000 });
      log.success('Mood indexes done\n');
    } else log.warn('Skipping Mood indexes (model not loaded)');

    if (models.Challenge && models.Challenge.collection) {
      log.info('Creating Challenge indexes...');
      await ensureIndex(models.Challenge.collection, { isActive: 1, createdAt: -1 }, {});
      await ensureIndex(models.Challenge.collection, { difficulty: 1 }, {});
      await ensureIndex(models.Challenge.collection, { category: 1 }, {});
      await ensureIndex(models.Challenge.collection, { points: 1 }, {});
      await ensureIndex(models.Challenge.collection, { title: 'text', description: 'text' }, {});
      log.success('Challenge indexes done\n');
    } else log.warn('Skipping Challenge indexes (model not loaded or invalid)');

    if (models.Community && models.Community.collection) {
      log.info('Creating Community indexes...');
      await ensureIndex(models.Community.collection, { author: 1, createdAt: -1 }, {});
      await ensureIndex(models.Community.collection, { category: 1 }, {});
      await ensureIndex(models.Community.collection, { isResolved: 1 }, {});
      await ensureIndex(models.Community.collection, { title: 'text', content: 'text' }, {});
      await ensureIndex(models.Community.collection, { createdAt: -1 }, {});
      await ensureIndex(models.Community.collection, { likes: 1 }, {});
      log.success('Community indexes done\n');
    } else log.warn('Skipping Community indexes (model not loaded)');

    if (models.Content && models.Content.collection) {
      log.info('Creating Content indexes...');
      await ensureIndex(models.Content.collection, { type: 1, isPublished: 1 }, {});
      await ensureIndex(models.Content.collection, { author: 1 }, {});
      await ensureIndex(models.Content.collection, { createdAt: -1 }, {});
      await ensureIndex(models.Content.collection, { title: 'text', body: 'text' }, {});
      log.success('Content indexes done\n');
    } else log.warn('Skipping Content indexes (model not loaded)');

    if (models.Notification && models.Notification.collection) {
      log.info('Creating Notification indexes...');
      await ensureIndex(models.Notification.collection, { recipient: 1, createdAt: -1 }, {});
      await ensureIndex(models.Notification.collection, { read: 1 }, {});
      await ensureIndex(models.Notification.collection, { type: 1 }, {});
      await ensureIndex(models.Notification.collection, { createdAt: 1 }, { expireAfterSeconds: 2592000 });
      log.success('Notification indexes done\n');
    } else log.warn('Skipping Notification indexes (model not loaded)');

    log.success('All available indexes processed!');
    process.exit(0);
  } catch (error) {
    log.error(`Index creation failed: ${error.message}`);
    logger.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      log.success('Connected to MongoDB');
      createIndexes();
    })
    .catch((error) => {
      log.error(`Connection failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { createIndexes };