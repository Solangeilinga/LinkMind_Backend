const { body, validationResult } = require('express-validator');
const {
  validateRegister,
  validateLogin,
  validateMoodEntry,
  validateChallengeCompletion,
  validatePostCreation,
} = require('../../middleware/validation.middleware');
const { createMockRequest, createMockResponse, createMockNext } = require('../utils/testHelpers');

describe('Validation Middleware', () => {
  describe('validateRegister', () => {
    it('should reject empty email', async () => {
      const req = createMockRequest({ body: { email: '', password: 'Test123!' } });
      const res = createMockResponse();
      const next = createMockNext();

      // Run validators and check
      await Promise.all(validateRegister.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.param === 'email')).toBe(true);
    });

    it('should reject weak password', async () => {
      const req = createMockRequest({ body: { email: 'test@test.com', password: 'weak' } });
      
      await Promise.all(validateRegister.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.param === 'password')).toBe(true);
    });

    it('should accept valid registration data', async () => {
      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          phoneNumber: '+1234567890',
          age: 25,
        },
      });

      await Promise.all(validateRegister.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('validateLogin', () => {
    it('should reject missing email', async () => {
      const req = createMockRequest({ body: { password: 'Test123!' } });
      
      await Promise.all(validateLogin.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
    });

    it('should accept valid login data', async () => {
      const req = createMockRequest({
        body: { email: 'test@example.com', password: 'Test123!' },
      });

      await Promise.all(validateLogin.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('validateMoodEntry', () => {
    it('should reject invalid mood score', async () => {
      const req = createMockRequest({
        body: { score: 6, label: 'Happy' }, // score out of range
      });

      await Promise.all(validateMoodEntry.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
      expect(errors.array().some(e => e.param === 'score')).toBe(true);
    });

    it('should accept valid mood entry', async () => {
      const req = createMockRequest({
        body: { score: 3, label: 'Anxious', energy: 4, factors: ['work'] },
      });

      await Promise.all(validateMoodEntry.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });
  });

  describe('validatePostCreation', () => {
    it('should reject empty content', async () => {
      const req = createMockRequest({ body: { content: '', isAnonymous: false } });

      await Promise.all(validatePostCreation.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
    });

    it('should reject content over 1500 chars', async () => {
      const req = createMockRequest({
        body: { content: 'a'.repeat(1600), isAnonymous: false },
      });

      await Promise.all(validatePostCreation.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(false);
    });

    it('should accept valid post', async () => {
      const req = createMockRequest({
        body: { content: 'This is a valid post content', isAnonymous: true },
      });

      await Promise.all(validatePostCreation.map(v => v.run(req)));
      const errors = validationResult(req);

      expect(errors.isEmpty()).toBe(true);
    });
  });
});
