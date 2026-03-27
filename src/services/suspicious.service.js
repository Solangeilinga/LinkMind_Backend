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
    const user = await User.findById(userId);
    if (!user) return { isSuspicious: false };
    
    user.recordActivity(activityType, metadata, ip, userAgent);
    
    const score = await this.calculateSuspicionScore(user, activityType);
    
    if (score > 50) {
      user.addSuspiciousFlag('suspicious_activity', score, { activityType, metadata });
      await user.save();
      
      if (score > 80) {
        console.log(`⚠️ Activité suspecte - Utilisateur ${userId}: score ${score}`);
      }
      
      return { isSuspicious: true, score };
    }
    
    await user.save();
    return { isSuspicious: false, score };
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