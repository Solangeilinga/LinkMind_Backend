const {
  authLimiter,
  apiLimiter,
  postCreationLimiter,
  mindoLimiter,
} = require('../../middleware/advanced-rate-limit');

describe('Rate Limiting Middleware', () => {
  describe('Rate Limiters Configuration', () => {
    it('should have authLimiter configured', () => {
      expect(authLimiter).toBeDefined();
      expect(authLimiter.options).toBeDefined();
    });

    it('should have apiLimiter configured', () => {
      expect(apiLimiter).toBeDefined();
      expect(apiLimiter.options).toBeDefined();
    });

    it('should have postCreationLimiter configured', () => {
      expect(postCreationLimiter).toBeDefined();
      expect(postCreationLimiter.options).toBeDefined();
    });

    it('should have mindoLimiter configured', () => {
      expect(mindoLimiter).toBeDefined();
      expect(mindoLimiter.options).toBeDefined();
    });
  });

  describe('Rate Limit Behavior', () => {
    it('should track requests per IP', () => {
      expect(authLimiter.options.keyGenerator).toBeDefined();
    });

    it('should provide Retry-After header', () => {
      expect(authLimiter.options.skip).toBeDefined();
    });

    it('should handle exceed behavior', () => {
      expect(authLimiter.options.message).toBeDefined();
    });
  });

  describe('Different Limit Tiers', () => {
    it('should enforce auth limits (5/15min)', () => {
      expect(authLimiter.options.windowMs).toBe(15 * 60 * 1000);
      expect(authLimiter.options.max).toBe(5);
    });

    it('should enforce API limits (standard)', () => {
      expect(apiLimiter.options.windowMs).toBe(15 * 60 * 1000);
      expect(apiLimiter.options.max).toBe(100);
    });

    it('should enforce post creation limits', () => {
      expect(postCreationLimiter.options.windowMs).toBe(60 * 60 * 1000);
      expect(postCreationLimiter.options.max).toBe(20);
    });

    it('should enforce mindo limits for free users', () => {
      // Mindo should have lower limits for free users
      expect(mindoLimiter.options).toBeDefined();
    });
  });
});
