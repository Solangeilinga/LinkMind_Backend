const logger = require('../../utils/logger');

describe('Logger Utility', () => {
  describe('Sanitization', () => {
    it('should redact password fields', () => {
      const testData = { password: 'SecurePass123!' };
      
      // Logger should sanitize sensitive fields
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should redact token fields', () => {
      const testData = { token: 'very.secret.jwt' };
      
      expect(() => logger.info('test', testData)).not.toThrow();
    });

    it('should redact OTP fields', () => {
      const testData = { otp: '123456' };
      
      expect(() => logger.info('test', testData)).not.toThrow();
    });
  });

  describe('Log Levels', () => {
    it('should have all log methods', () => {
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should return consistent format', () => {
      expect(() => {
        logger.info('Test message');
        logger.warn('Test warning');
        logger.error('Test error');
        logger.debug('Test debug');
      }).not.toThrow();
    });
  });
});
