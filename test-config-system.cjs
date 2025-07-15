#!/usr/bin/env node

/**
 * Configuration System Test Script
 * Tests the dashboard configuration system functionality
 */

const { DashboardConfig } = require('./lib/dashboard-config.cjs');
const fs = require('fs');
const path = require('path');

// Test configuration file path
const testConfigFile = 'test-dashboard-config.json';

console.log('🧪 Testing Like-I-Said Dashboard Configuration System\n');

async function runTests() {
  let testsPassed = 0;
  let testsTotal = 0;
  
  function test(name, testFn) {
    testsTotal++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ ${name}`);
        testsPassed++;
      } else {
        console.log(`❌ ${name}`);
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error.message}`);
    }
  }
  
  // Clean up any existing test config
  if (fs.existsSync(testConfigFile)) {
    fs.unlinkSync(testConfigFile);
  }
  
  console.log('📋 Basic Configuration Tests\n');
  
  // Test 1: Create configuration instance
  test('Create configuration instance', () => {
    const config = new DashboardConfig();
    return config !== null;
  });
  
  // Test 2: Load default configuration
  test('Load default configuration', () => {
    const config = new DashboardConfig();
    const memoryDir = config.get('memoryDirectory');
    return memoryDir !== undefined && typeof memoryDir === 'string';
  });
  
  // Test 3: Set and get configuration values
  test('Set and get configuration values', () => {
    const config = new DashboardConfig();
    config.set('preferredPort', 3005);
    return config.get('preferredPort') === 3005;
  });
  
  // Test 4: Validate boolean settings
  test('Handle boolean settings correctly', () => {
    const config = new DashboardConfig();
    config.set('autoOpenBrowser', false);
    return config.get('autoOpenBrowser') === false;
  });
  
  // Test 5: Configuration persistence
  test('Configuration persistence', () => {
    const config = new DashboardConfig();
    config.set('preferredPort', 3010);
    config.set('autoOpenBrowser', false);
    
    // Create new instance and check if values persist
    const config2 = new DashboardConfig();
    return config2.get('preferredPort') === 3010 && config2.get('autoOpenBrowser') === false;
  });
  
  console.log('\n📁 Directory Validation Tests\n');
  
  // Test 6: Validate existing directory
  test('Validate existing directory', () => {
    const config = new DashboardConfig();
    const currentDir = process.cwd();
    config.set('memoryDirectory', currentDir);
    const validation = config.validateDirectories();
    return validation.memoryDirectory.exists && validation.memoryDirectory.writable;
  });
  
  // Test 7: Handle non-existent directory
  test('Handle non-existent directory', () => {
    const config = new DashboardConfig();
    const nonExistentDir = path.join(process.cwd(), 'non-existent-test-dir');
    config.set('memoryDirectory', nonExistentDir);
    config.set('createDirectories', false);
    const validation = config.validateDirectories();
    return !validation.memoryDirectory.exists && validation.memoryDirectory.error !== null;
  });
  
  // Test 8: Auto-create directory functionality
  test('Auto-create directory functionality', () => {
    const config = new DashboardConfig();
    const testDir = path.join(process.cwd(), 'test-auto-create-dir');
    
    // Clean up if exists
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    
    config.set('memoryDirectory', testDir);
    config.set('createDirectories', true);
    const validation = config.validateDirectories();
    
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    
    return validation.memoryDirectory.created;
  });
  
  console.log('\n⚙️ Configuration Features Tests\n');
  
  // Test 9: Get all configuration
  test('Get all configuration', () => {
    const config = new DashboardConfig();
    const allConfig = config.getAll();
    return typeof allConfig === 'object' && 
           allConfig.hasOwnProperty('memoryDirectory') &&
           allConfig.hasOwnProperty('preferredPort');
  });
  
  // Test 10: Reset configuration
  test('Reset configuration', () => {
    const config = new DashboardConfig();
    config.set('preferredPort', 9999);
    config.reset();
    return config.get('preferredPort') === 3001; // Default value
  });
  
  // Test 11: Configuration file exists check
  test('Configuration file exists check', () => {
    const config = new DashboardConfig();
    return typeof config.configExists() === 'boolean';
  });
  
  // Test 12: Windows path handling
  test('Windows path compatibility', () => {
    const config = new DashboardConfig();
    const windowsPaths = config.getWindowsPaths();
    return typeof windowsPaths.memoryDirectory === 'string' &&
           typeof windowsPaths.taskDirectory === 'string';
  });
  
  console.log('\n🔧 Advanced Features Tests\n');
  
  // Test 13: Export configuration
  test('Export configuration', () => {
    const config = new DashboardConfig();
    const exported = config.exportConfig();
    return exported.hasOwnProperty('paths') && 
           exported.hasOwnProperty('validation') &&
           exported.hasOwnProperty('memoryDirectory');
  });
  
  // Test 14: Port validation
  test('Port validation in range', () => {
    const config = new DashboardConfig();
    config.set('preferredPort', 8080);
    return config.get('preferredPort') === 8080;
  });
  
  // Test 15: Invalid port handling
  test('Invalid port rejection', () => {
    const config = new DashboardConfig();
    const originalPort = config.get('preferredPort');
    config.set('preferredPort', 'invalid');
    return config.get('preferredPort') === originalPort; // Should remain unchanged
  });
  
  console.log('\n📊 Test Results Summary\n');
  console.log(`Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`Success Rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 All tests passed! Configuration system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
  
  // Clean up test configuration file
  if (fs.existsSync('dashboard-config.json')) {
    fs.unlinkSync('dashboard-config.json');
  }
  
  return testsPassed === testsTotal;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`\n💥 Test suite failed: ${error.message}`);
  process.exit(1);
});