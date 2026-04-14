const jwt = require('jsonwebtoken');

// Mock user data generators
const generateMockUser = (overrides = {}) => {
  const defaultUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: '$2b$10$xyz123', // hashed 'password123'
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
    age: 25,
    accountStatus: 'active',
    profileImg: null,
    points: 100,
    level: 'bronze',
    tasksCompleted: 5,
    streakDays: 3,
    badges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...defaultUser, ...overrides };
};

const generateMockMoodEntry = (overrides = {}) => {
  return {
    _id: '507f1f77bcf86cd799439012',
    user: '507f1f77bcf86cd799439011',
    score: 3,
    label: 'Anxious',
    energy: 4,
    factors: ['work', 'sleep'],
    notes: 'Feeling stressed about deadlines',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

const generateMockChallenge = (overrides = {}) => {
  return {
    _id: '507f1f77bcf86cd799439013',
    title: 'Morning Meditation',
    description: 'Meditate for 10 minutes',
    difficulty: 'easy',
    points: 10,
    duration: 10,
    category: 'mindfulness',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

// JWT token generators
const generateValidToken = (userId = '507f1f77bcf86cd799439011') => {
  return jwt.sign(
    { id: userId, email: 'test@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateExpiredToken = (userId = '507f1f77bcf86cd799439011') => {
  return jwt.sign(
    { id: userId, email: 'test@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: '-1h' } // Expired
  );
};

// Express mock request/response helpers
const createMockRequest = (overrides = {}) => {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    user: null,
    ip: '127.0.0.1',
    ...overrides,
  };
};

const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    statusCode: 200,
  };
  return res;
};

const createMockNext = () => {
  return jest.fn();
};

// Validation helpers
const expectValidationError = (res, field) => {
  expect(res.status).toHaveBeenCalledWith(400);
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall.errors).toBeDefined();
  expect(jsonCall.errors.some(e => e.param === field)).toBe(true);
};

const expectSuccessResponse = (res, statusCode = 200) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  expect(res.json).toHaveBeenCalled();
};

const expectErrorResponse = (res, statusCode = 400, message = null) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  if (message) {
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.message).toContain(message);
  }
};

module.exports = {
  generateMockUser,
  generateMockMoodEntry,
  generateMockChallenge,
  generateValidToken,
  generateExpiredToken,
  createMockRequest,
  createMockResponse,
  createMockNext,
  expectValidationError,
  expectSuccessResponse,
  expectErrorResponse,
};
