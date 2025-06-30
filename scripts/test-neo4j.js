#!/usr/bin/env node

import { Neo4jConnector } from '../lib/neo4j-connector.js';

async function testNeo4jIntegration() {
  console.log('🧪 Testing Neo4j Integration...\n');
  
  const neo4j = new Neo4jConnector();
  let testsPassed = 0;
  let totalTests = 0;

  try {
    // Test 1: Connection
    totalTests++;
    console.log('1️⃣ Testing connection...');
    await neo4j.connect();
    console.log('   ✅ Connected successfully');
    testsPassed++;

    // Test 2: Schema initialization
    totalTests++;
    console.log('2️⃣ Testing schema initialization...');
    await neo4j.initializeSchema();
    console.log('   ✅ Schema initialized');
    testsPassed++;

    // Test 3: Health check
    totalTests++;
    console.log('3️⃣ Testing health check...');
    const health = await neo4j.healthCheck();
    if (health.connected && health.querySuccess) {
      console.log('   ✅ Health check passed');
      testsPassed++;
    } else {
      console.log('   ❌ Health check failed:', health);
    }

    // Test 4: Create memory node
    totalTests++;
    console.log('4️⃣ Testing memory node creation...');
    const testMemory = {
      id: 'test_memory_' + Date.now(),
      title: 'Test Memory for Neo4j Integration',
      content: 'This is a test memory created to verify Neo4j integration is working correctly.',
      timestamp: new Date().toISOString(),
      complexity: 2,
      priority: 'high',
      status: 'active',
      file_path: 'test/test-memory.md',
      content_hash: 'test_hash_123',
      access_count: 1,
      last_accessed: new Date().toISOString(),
      language: 'markdown'
    };

    const memoryNode = await neo4j.createMemoryNode(testMemory);
    if (memoryNode) {
      console.log('   ✅ Memory node created successfully');
      testsPassed++;
    } else {
      console.log('   ❌ Failed to create memory node');
    }

    // Test 5: Create category and connect
    totalTests++;
    console.log('5️⃣ Testing category creation and connection...');
    await neo4j.createCategoryNode('test-category', { 
      description: 'Test category for Neo4j integration',
      color: '#FF5733'
    });
    const connected = await neo4j.connectMemoryToCategory(testMemory.id, 'test-category');
    if (connected) {
      console.log('   ✅ Category created and connected');
      testsPassed++;
    } else {
      console.log('   ❌ Failed to connect memory to category');
    }

    // Test 6: Create tags and connect
    totalTests++;
    console.log('6️⃣ Testing tag creation and connection...');
    const tagsConnected = await neo4j.connectMemoryToTags(testMemory.id, ['test', 'neo4j', 'integration']);
    if (tagsConnected) {
      console.log('   ✅ Tags created and connected');
      testsPassed++;
    } else {
      console.log('   ❌ Failed to connect tags');
    }

    // Test 7: Get memory stats
    totalTests++;
    console.log('7️⃣ Testing memory statistics...');
    const stats = await neo4j.getMemoryStats();
    if (stats && stats.totalMemories > 0) {
      console.log(`   ✅ Stats retrieved: ${stats.totalMemories} memories, ${stats.totalCategories} categories, ${stats.totalTags} tags`);
      testsPassed++;
    } else {
      console.log('   ❌ Failed to get memory stats');
    }

    // Test 8: Search memories
    totalTests++;
    console.log('8️⃣ Testing memory search...');
    // Note: This test might fail if full-text index isn't ready yet
    try {
      const searchResults = await neo4j.searchMemories('test integration');
      console.log(`   ✅ Search completed, found ${searchResults.length} results`);
      testsPassed++;
    } catch (error) {
      console.log('   ⚠️ Search test skipped (full-text index may not be ready)');
      // Don't count this as a failure since it's expected in fresh installations
    }

    // Test 9: Cleanup test data
    console.log('9️⃣ Cleaning up test data...');
    await neo4j.executeQuery(`
      MATCH (m:Memory {id: $id})
      OPTIONAL MATCH (m)-[r1]-()
      OPTIONAL MATCH ()-[r2]-(m)
      DELETE r1, r2, m
    `, { id: testMemory.id });
    
    await neo4j.executeQuery(`
      MATCH (c:Category {name: 'test-category'})
      WHERE NOT (c)<-[:BELONGS_TO]-()
      DELETE c
    `);
    
    console.log('   ✅ Test data cleaned up');

    // Final results
    console.log('\n📊 Test Results:');
    console.log('='.repeat(40));
    console.log(`✅ Tests passed: ${testsPassed}/${totalTests}`);
    
    if (testsPassed === totalTests) {
      console.log('🎉 All tests passed! Neo4j integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the output above for details.');
    }

    console.log('\n📍 Next steps:');
    console.log('   1. Start the migration: npm run migrate:neo4j');
    console.log('   2. Explore your graph: http://localhost:7474');
    console.log('   3. Test some Cypher queries in the browser');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await neo4j.disconnect();
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNeo4jIntegration();
}

export { testNeo4jIntegration };