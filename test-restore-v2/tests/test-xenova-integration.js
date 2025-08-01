#!/usr/bin/env node

/**
 * Test Xenova/Transformers Integration
 * 
 * This test suite verifies that the optional dependency loading,
 * dynamic imports, and fallback behavior work correctly.
 */

import { VectorStorage } from '../lib/vector-storage.js';
import { optionalImport, isModuleAvailable, getImportStats } from '../lib/optional-import.js';
import { settingsManager } from '../lib/settings-manager.js';
import { platform } from 'os';
import assert from 'assert';

console.log('🧪 Testing Xenova/Transformers Integration...\n');

// Test suite
const tests = [];

// Test 1: Check optional import utility
tests.push({
  name: 'Optional Import - Module Availability Check',
  async run() {
    console.log('Checking if @xenova/transformers is available...');
    const available = await isModuleAvailable('@xenova/transformers');
    console.log(`Module available: ${available}`);
    console.log(`Platform: ${platform()}`);
    
    const stats = getImportStats();
    console.log('Import stats:', JSON.stringify(stats, null, 2));
    
    // Test shouldn't fail regardless of availability
    return true;
  }
});

// Test 2: Check settings manager integration
tests.push({
  name: 'Settings Manager - Semantic Search Settings',
  async run() {
    console.log('Checking semantic search settings...');
    
    const settings = {
      enabled: settingsManager.getSetting('features.enableSemanticSearch'),
      provider: settingsManager.getSetting('features.semanticSearchProvider'),
      blockOnWindows: settingsManager.getSetting('features.blockXenovaOnWindows')
    };
    
    console.log('Current settings:', JSON.stringify(settings, null, 2));
    
    // Verify settings have expected structure
    assert(typeof settings.enabled === 'boolean', 'enableSemanticSearch should be boolean');
    assert(['xenova', 'ollama', 'none'].includes(settings.provider), 'Invalid provider');
    assert(typeof settings.blockOnWindows === 'boolean', 'blockOnWindows should be boolean');
    
    return true;
  }
});

// Test 3: VectorStorage initialization without xenova
tests.push({
  name: 'VectorStorage - Initialization without Xenova',
  async run() {
    console.log('Testing VectorStorage with semantic search disabled...');
    
    // Temporarily disable semantic search
    const originalSetting = settingsManager.getSetting('features.enableSemanticSearch');
    settingsManager.updateSetting('features.enableSemanticSearch', false);
    
    try {
      const vectorStorage = new VectorStorage();
      await vectorStorage.initialize();
      
      console.log('VectorStorage status:', vectorStorage.getStatus());
      
      assert(vectorStorage.initialized === true, 'Should be initialized');
      assert(vectorStorage.available === false, 'Should not be available when disabled');
      assert(vectorStorage.provider === 'none', 'Provider should be none');
      
      // Restore original setting
      settingsManager.updateSetting('features.enableSemanticSearch', originalSetting);
      
      return true;
    } catch (error) {
      // Restore setting on error
      settingsManager.updateSetting('features.enableSemanticSearch', originalSetting);
      throw error;
    }
  }
});

// Test 4: VectorStorage with xenova (if available)
tests.push({
  name: 'VectorStorage - Initialization with Xenova',
  async run() {
    console.log('Testing VectorStorage with xenova provider...');
    
    // Enable semantic search with xenova
    const originalSettings = {
      enabled: settingsManager.getSetting('features.enableSemanticSearch'),
      provider: settingsManager.getSetting('features.semanticSearchProvider')
    };
    
    settingsManager.updateSetting('features.enableSemanticSearch', true);
    settingsManager.updateSetting('features.semanticSearchProvider', 'xenova');
    
    try {
      const vectorStorage = new VectorStorage();
      await vectorStorage.initialize();
      
      const status = vectorStorage.getStatus();
      console.log('VectorStorage status:', JSON.stringify(status, null, 2));
      
      assert(vectorStorage.initialized === true, 'Should be initialized');
      
      // Check if xenova was loaded
      if (status.transformersLoaded) {
        console.log('✅ Xenova transformers loaded successfully');
        assert(vectorStorage.available === true, 'Should be available when loaded');
        assert(vectorStorage.provider === 'xenova', 'Provider should be xenova');
      } else {
        console.log('⚠️  Xenova transformers not loaded (expected on some systems)');
        assert(vectorStorage.available === false, 'Should not be available when not loaded');
        assert(vectorStorage.provider === 'none', 'Provider should be none when not loaded');
      }
      
      // Restore original settings
      settingsManager.updateSetting('features.enableSemanticSearch', originalSettings.enabled);
      settingsManager.updateSetting('features.semanticSearchProvider', originalSettings.provider);
      
      return true;
    } catch (error) {
      // Restore settings on error
      settingsManager.updateSetting('features.enableSemanticSearch', originalSettings.enabled);
      settingsManager.updateSetting('features.semanticSearchProvider', originalSettings.provider);
      throw error;
    }
  }
});

// Test 5: Fallback behavior
tests.push({
  name: 'VectorStorage - Fallback Behavior',
  async run() {
    console.log('Testing fallback behavior...');
    
    const vectorStorage = new VectorStorage();
    await vectorStorage.initialize();
    
    // Try to use methods even if not available
    const memory = {
      id: 'test-memory-1',
      content: 'Test memory content',
      category: 'test',
      tags: ['test'],
      project: 'test-project'
    };
    
    // Should not throw even if not available
    await vectorStorage.addMemory(memory);
    
    // Search should return empty array if not available
    const results = await vectorStorage.searchSimilar('test query');
    assert(Array.isArray(results), 'Search should return array');
    
    if (!vectorStorage.available) {
      assert(results.length === 0, 'Search should return empty array when not available');
    }
    
    return true;
  }
});

// Test 6: Platform blocking
tests.push({
  name: 'Platform Blocking - Windows Check',
  async run() {
    console.log('Testing platform blocking...');
    
    if (platform() === 'win32') {
      console.log('Running on Windows - testing block functionality');
      
      // Test with blocking enabled
      settingsManager.updateSetting('features.blockXenovaOnWindows', true);
      
      const vectorStorage = new VectorStorage();
      await vectorStorage.initialize();
      
      assert(vectorStorage.available === false, 'Should not be available on Windows when blocked');
      
      // Reset setting
      settingsManager.updateSetting('features.blockXenovaOnWindows', false);
    } else {
      console.log(`Running on ${platform()} - Windows blocking not applicable`);
    }
    
    return true;
  }
});

// Run all tests
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log('-'.repeat(50));
    
    try {
      await test.run();
      console.log('✅ PASSED');
      passed++;
    } catch (error) {
      console.log('❌ FAILED');
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});