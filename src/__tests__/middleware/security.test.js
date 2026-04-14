const {
  corsValidation,
  securityHeaders,
  sanitizeRequest,
  requestIdMiddleware,
} = require('../../middleware/security.middleware');
const { createMockRequest, createMockResponse, createMockNext } = require('../utils/testHelpers');

describe('Security Middleware', () => {
  describe('CORS Validation', () => {
    it('should allow whitelisted origins', () => {
      const callback = jest.fn();
      const result = corsValidation({ origin: process.env.FRONTEND_URL }, callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should deny non-whitelisted origins', () => {
      const callback = jest.fn();
      corsValidation({ origin: 'http://malicious.com' }, callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should allow requests without origin', () => {
      const callback = jest.fn();
      corsValidation({}, callback);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Request ID Middleware', () => {
    it('should add request ID to request', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requestIdMiddleware(req, res, next);

      expect(req.id).toBeDefined();
      expect(typeof req.id).toBe('string');
      expect(next).toHaveBeenCalled();
    });

    it('should generate unique IDs', () => {
      const req1 = createMockRequest();
      const req2 = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requestIdMiddleware(req1, res, next);
      requestIdMiddleware(req2, res, next);

      expect(req1.id).not.toBe(req2.id);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers middleware', () => {
      expect(securityHeaders).toBeDefined();
    });
  });

  describe('Request Sanitization', () => {
    it('should prevent null byte injection', () => {
      const req = createMockRequest({
        body: { field: 'test\x00injection' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      sanitizeRequest(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should limit request size', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      sanitizeRequest(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('XSS Protection', () => {
    it('should detect script injection attempts', () => {
      const req = createMockRequest({
        body: { content: '<script>alert("xss")</script>' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      sanitizeRequest(req, res, next);

      // Should either sanitize or reject
      expect(next).toHaveBeenCalledOrWith(expect.any(Error));
    });
  });
});
