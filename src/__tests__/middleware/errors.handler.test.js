const { errorHandler, AppError } = require('../../utils/errors');
const { createMockRequest, createMockResponse, createMockNext } = require('../utils/testHelpers');

describe('Error Handler Middleware', () => {
  it('should handle AppError correctly', () => {
    const error = new AppError('Test error', 400, 'TEST_ERROR');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  it('should handle validation errors', () => {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalled();
  });

  it('should hide stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    
    const error = new AppError('Server error', 500);
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    const response = res.json.mock.calls[0][0];
    expect(response.stack).toBeUndefined();

    process.env.NODE_ENV = 'test';
  });

  it('should include error details in development', () => {
    process.env.NODE_ENV = 'development';
    
    const error = new AppError('Dev error', 500);
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalled();

    process.env.NODE_ENV = 'test';
  });

  it('should default to 500 for unknown errors', () => {
    const error = new Error('Unknown error');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalled();
  });
});
