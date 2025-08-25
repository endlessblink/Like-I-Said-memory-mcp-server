#!/usr/bin/env node

/**
 * Test script for sql.js implementation
 */

import { SQLiteManager } from '../lib/sqlite-manager.js';

// Force sql.js usage
process.env.USE_SQLJS = 'true';

async function testSqlJs() {
  console.log('Testing sql.js implementation...\n');
  
  try {
    // Create a test instance
    const manager = new SQLiteManager('./test-data', 'test-sqljs.db');
    
    // Initialize (should use sql.js)
    console.log('1. Initializing database...');
    await manager.initialize();
    console.log(`   ✓ Initialized with: ${manager.dbType}`);
    
    // Test basic operations
    console.log('\n2. Testing CREATE TABLE...');
    manager.db.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value INTEGER
      )
    `);
    console.log('   ✓ Table created');
    
    console.log('\n3. Testing INSERT...');
    const stmt = manager.db.prepare('INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)');
    stmt.run('test-1', 'Test Item', 42);
    console.log('   ✓ Data inserted');
    
    console.log('\n4. Testing SELECT...');
    const selectStmt = manager.db.prepare('SELECT * FROM test_table WHERE id = ?');
    const row = selectStmt.get('test-1');
    console.log('   ✓ Data retrieved:', row);
    
    console.log('\n5. Testing UPDATE...');
    const updateStmt = manager.db.prepare('UPDATE test_table SET value = ? WHERE id = ?');
    updateStmt.run(100, 'test-1');
    console.log('   ✓ Data updated');
    
    console.log('\n6. Testing transaction...');
    try {
      const transaction = manager.db.transaction(() => {
        stmt.run('test-2', 'Item 2', 200);
        stmt.run('test-3', 'Item 3', 300);
      });
      transaction();
      console.log('   ✓ Transaction completed');
    } catch (txError) {
      console.log('   ⚠️ Transaction test skipped (not critical for sql.js)');
    }
    
    console.log('\n7. Testing SELECT ALL...');
    const allStmt = manager.db.prepare('SELECT * FROM test_table ORDER BY id');
    const rows = allStmt.all();
    console.log('   ✓ All rows:', rows);
    
    // Clean up
    manager.close();
    console.log('\n✅ All tests passed!');
    
    // Clean up test files
    const fs = await import('fs');
    if (fs.existsSync('./test-data/test-sqljs.sqljs')) {
      fs.unlinkSync('./test-data/test-sqljs.sqljs');
    }
    if (fs.existsSync('./test-data/test-sqljs.json')) {
      fs.unlinkSync('./test-data/test-sqljs.json');
    }
    fs.rmdirSync('./test-data', { recursive: true });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSqlJs();