/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  preset: 'jest-environment-node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@endlessblink|.*\\.mjs$))'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'lib/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
  maxWorkers: 1, // Prevent worker exit issues
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    jest: true
  }
};