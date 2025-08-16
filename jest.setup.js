// Jest setup file for ES modules and globals
// This file is loaded before each test file

// Import Jest globals for ES modules support
import { jest } from '@jest/globals';

// Make jest available globally for ES modules tests
global.jest = jest;

// Set default timeout for all tests
jest.setTimeout(30000);

// Optional: Add global test configuration
// Mock console.log during tests to reduce noise
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});