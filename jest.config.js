module.exports = {
  displayName: 'Backend Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/scripts/**',
    '!src/uploads/**',
    '!src/public/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 10000,
  maxWorkers: '50%',
  detectOpenHandles: true,
  forceExit: true,
  bail: 0,
  verbose: true,
  errorOnDeprecated: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  }
};
