/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Removed invalid preset: 'jest-environment-node' is a test environment, not a preset
  
  // ES modules configuration
  // Note: extensionsToTreatAsEsm not needed - .js is inferred from package.json "type": "module"
  transform: {}, // Disable transforms for native ES modules
  
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@endlessblink|.*\\.mjs$))'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    'node_modules/',
    'data-backups/',
    'dist/',
    'coverage/'
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