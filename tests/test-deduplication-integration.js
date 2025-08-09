#!/usr/bin/env node
/**
 * Simple integration test for memory deduplication functionality
 */

import { MemoryDeduplicator } from '../lib/memory-deduplicator.js';
import { MemoryStorageWrapper } from '../lib/memory-storage-wrapper.js';

async function testDeduplicationIntegration() {
  console.log('🧪 Testing Memory Deduplication Integration...\n');

  try {
    // Test 1: Initialize components
    console.log('1️⃣ Initializing storage and deduplicator...');
    const storage = new MemoryStorageWrapper('./memories');
    const deduplicator = new MemoryDeduplicator(storage);
    console.log('✅ Components initialized successfully\n');

    // Test 2: Preview deduplication
    console.log('2️⃣ Testing preview deduplication...');
    const preview = await deduplicator.previewDeduplication();
    
    console.log('📊 Preview Results:');
    console.log(`   • Total memories: ${preview.totalMemories}`);
    console.log(`   • Unique memories: ${preview.uniqueMemories}`);
    console.log(`   • Duplicated IDs: ${preview.duplicatedIds}`);
    console.log(`   • Files to remove: ${preview.totalDuplicateFiles}`);
    
    if (preview.duplicatedIds === 0) {
      console.log('✅ No duplicates found - system is clean!\n');
    } else {
      console.log(`⚠️  Found ${preview.duplicatedIds} duplicate groups\n`);
    }

    // Test 3: API structure validation
    console.log('3️⃣ Validating API response structure...');
    const requiredFields = ['totalMemories', 'uniqueMemories', 'duplicatedIds', 'totalDuplicateFiles'];
    const missingFields = requiredFields.filter(field => !(field in preview));
    
    if (missingFields.length === 0) {
      console.log('✅ All required API fields present');
    } else {
      console.log(`❌ Missing API fields: ${missingFields.join(', ')}`);
      throw new Error('API structure validation failed');
    }

    // Test 4: Edge case handling
    console.log('\n4️⃣ Testing edge case handling...');
    
    // Test with null/undefined arrays
    const duplicates = preview.duplicates || [];
    console.log(`   • Duplicate groups array: ${Array.isArray(duplicates) ? 'Valid array' : 'Invalid'}`);
    
    // Test duplicate groups structure
    if (duplicates.length > 0) {
      const firstGroup = duplicates[0];
      const requiredGroupFields = ['id', 'keepFile', 'removeFiles'];
      const missingGroupFields = requiredGroupFields.filter(field => !(field in firstGroup));
      
      if (missingGroupFields.length === 0) {
        console.log('✅ Duplicate group structure is valid');
      } else {
        console.log(`❌ Missing group fields: ${missingGroupFields.join(', ')}`);
        throw new Error('Duplicate group structure validation failed');
      }
    } else {
      console.log('✅ No duplicate groups to validate (clean system)');
    }

    console.log('\n🎉 All integration tests passed!');
    console.log('✅ Memory deduplication API is working correctly');
    return true;

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDeduplicationIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { testDeduplicationIntegration };