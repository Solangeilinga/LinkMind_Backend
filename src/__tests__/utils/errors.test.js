const { AppError, asyncHandler } = require('../../utils/errors');

describe('Error Handling', () => {
  describe('AppError Class', () => {
    it('should create error with message and status', () => {
      const error = new AppError('User not found', 404, 'USER_NOT_FOUND');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('USER_NOT_FOUND');
      expect(error instanceof Error).toBe(true);
    });

    it('should default to 500 status', () => {
      const error = new AppError('Internal error');

      expect(error.statusCode).toBe(500);
    });

    it('should have isOperational flag', () => {
      const error = new AppError('Operational error', 400);

      expect(error.isOperational).toBe(true);
    });
  });

  describe('asyncHandler Wrapper', () => {
    it('should handle async errors', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('DB error'));
      const wrappedHandler = asyncHandler(mockHandler);

      const req = {};
      const res = {};
      const next = jest.fn();

      await wrappedHandler(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass successful responses normally', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const wrappedHandler = asyncHandler(mockHandler);

      const req = {};
      const res = {};
      const next = jest.fn();

      const result = await wrappedHandler(req, res, next);

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Error Types', () => {
    it('should handle validation errors', () => {
      const error = new AppError('Invalid input', 400, 'VALIDATION_ERROR');

      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle unauthorized errors', () => {
      const error = new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
    });

    it('should handle not found errors', () => {
      const error = new AppError('Resource not found', 404, 'NOT_FOUND');

      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
    });

    it('should handle rate limit errors', () => {
      const error = new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');

      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
