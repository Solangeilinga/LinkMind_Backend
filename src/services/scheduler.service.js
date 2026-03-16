const cron = require('node-cron');
const User = require('../models/user.model');

/**
 * Daily cron jobs for LinkMind
 */
exports.scheduleDailyChallenge = () => {
  // Every day at midnight: reset streak for inactive users
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily streak check...');
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      yesterday.setHours(23, 59, 59, 999);

      // Users who haven't been active in 2 days → reset streak
      await User.updateMany(
        {
          lastActivityDate: { $lte: yesterday },
          streakDays: { $gt: 0 },
        },
        { $set: { streakDays: 0 } }
      );

      console.log('[CRON] Streak check complete.');
    } catch (err) {
      console.error('[CRON] Error:', err.message);
    }
  });

  // Every Sunday at 8AM: create a new weekly group challenge (placeholder)
  cron.schedule('0 8 * * 0', () => {
    console.log('[CRON] Weekly group challenge rotation triggered.');
    // TODO: auto-create GroupChallenge from predefined pool
  });

  console.log('⏰ Cron jobs scheduled');
};
