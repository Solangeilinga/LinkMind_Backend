const User = require('../models/user.model');

// Configuration des seuils
const SUSPICIOUS_THRESHOLDS = {
  rapidReports: {
    count: 10,
    window: 5 * 60 * 1000,
    action: 'rate_limit'
  },
  rapidPosts: {
    count: 5,
    window: 60 * 1000,
    action: 'slow_down'
  },
  rapidComments: {
    count: 10,
    window: 60 * 1000,
    action: 'slow_down'
  }
};

class SuspiciousActivityService {
  
  static async recordActivity(userId, activityType, metadata = {}, ip, userAgent) {
    try {
      // 1. Enregistrer l'activité avec mise à jour atomique (pas de conflit de version)
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            activityLog: {
              type: activityType,
              timestamp: new Date(),
              metadata,
              ip,
              userAgent,
            },
          },
          $set: { lastActivity: new Date() },
        }
      );

      // 2. Récupérer l'utilisateur pour calculer le score
      const user = await User.findById(userId);
      if (!user) return { isSuspicious: false };

      const score = await this.calculateSuspicionScore(user, activityType);

      if (score > 50) {
        const updateData = {
          $push: {
            flags: {
              type: 'suspicious_activity',
              score,
              timestamp: new Date(),
              metadata: { activityType, ...metadata },
            },
          },
          $inc: { suspicionScore: score },
        };

        if (score > 70 && !user.restricted) {
          updateData.$set = {
            restricted: true,
            restrictionReason: 'Activité suspecte détectée',
            restrictedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          };
        }

        await User.updateOne({ _id: userId }, updateData);

        if (score > 80) {
          console.log(`⚠️ Activité suspecte - Utilisateur ${userId}: score ${score}`);
        }

        return { isSuspicious: true, score };
      }

      return { isSuspicious: false, score };
    } catch (err) {
      console.error('Erreur dans SuspiciousActivityService.recordActivity:', err);
      return { isSuspicious: false };
    }
  }
  
  static async calculateSuspicionScore(user, activityType) {
    let score = 0;
    const now = new Date();
    const recentActivities = user.activityLog?.filter(
      a => now - new Date(a.timestamp) < SUSPICIOUS_THRESHOLDS.rapidReports.window
    ) || [];
    
    if (activityType === 'report') {
      const reportCount = recentActivities.filter(a => a.type === 'report').length;
      if (reportCount >= SUSPICIOUS_THRESHOLDS.rapidReports.count) {
        score += 50;
      }
    }
    
    if (activityType === 'post') {
      const postCount = recentActivities.filter(a => a.type === 'post').length;
      if (postCount >= SUSPICIOUS_THRESHOLDS.rapidPosts.count) {
        score += 30;
      }
    }
    
    if (activityType === 'comment') {
      const commentCount = recentActivities.filter(a => a.type === 'comment').length;
      if (commentCount >= SUSPICIOUS_THRESHOLDS.rapidComments.count) {
        score += 20;
      }
    }
    
    if (user.reportCount > 10) {
      score += Math.min(user.reportCount, 50);
    }
    
    const accountAge = now - new Date(user.createdAt);
    if (accountAge < 24 * 60 * 60 * 1000) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }
}

module.exports = SuspiciousActivityService;