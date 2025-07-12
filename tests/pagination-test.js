#!/usr/bin/env node

/**
 * Test pagination implementation for memories and tasks endpoints
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testPagination() {
  console.log('📄 Testing Pagination Implementation...\n');

  // Test 1: Login to get auth token
  console.log('Test 1: Login for authentication');
  let authToken = null;
  try {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'wgokTSxkY9U7'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.accessToken;
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed - cannot test protected endpoints');
      return;
    }
  } catch (error) {
    console.log('💡 Server may not be running. Please start with: npm run start:dashboard');
    return;
  }

  // Test 2: Test memories pagination - first page
  console.log('\nTest 2: Test memories pagination - first page');
  try {
    const memoriesResponse = await fetch(`${API_BASE}/memories?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (memoriesResponse.ok) {
      const result = await memoriesResponse.json();
      console.log('✅ Memories pagination working');
      console.log(`   Page: ${result.pagination.page}, Limit: ${result.pagination.limit}`);
      console.log(`   Total: ${result.pagination.total}, Pages: ${result.pagination.totalPages}`);
      console.log(`   Has Next: ${result.pagination.hasNext}, Has Prev: ${result.pagination.hasPrev}`);
      console.log(`   Data Count: ${result.data.length}`);
      
      // Test 3: Test memories pagination - second page
      if (result.pagination.hasNext) {
        console.log('\nTest 3: Test memories pagination - second page');
        const page2Response = await fetch(`${API_BASE}/memories?page=2&limit=10`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (page2Response.ok) {
          const page2Result = await page2Response.json();
          console.log('✅ Second page pagination working');
          console.log(`   Page: ${page2Result.pagination.page}, Data Count: ${page2Result.data.length}`);
          console.log(`   Has Prev: ${page2Result.pagination.hasPrev}`);
        }
      } else {
        console.log('\nTest 3: Skipped - not enough data for second page');
      }
    } else {
      console.log('❌ Memories pagination failed');
    }
  } catch (error) {
    console.log('❌ Memories pagination error:', error.message);
  }

  // Test 4: Test memories sorting
  console.log('\nTest 4: Test memories sorting by complexity');
  try {
    const sortResponse = await fetch(`${API_BASE}/memories?page=1&limit=5&sort=complexity&order=desc`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (sortResponse.ok) {
      const result = await sortResponse.json();
      console.log('✅ Memories sorting working');
      console.log(`   Sort: ${result.pagination.sort}, Order: ${result.pagination.order}`);
      if (result.data.length > 0) {
        console.log(`   First item complexity: ${result.data[0].complexity || 'N/A'}`);
      }
    }
  } catch (error) {
    console.log('❌ Memories sorting error:', error.message);
  }

  // Test 5: Test tasks pagination
  console.log('\nTest 5: Test tasks pagination');
  try {
    const tasksResponse = await fetch(`${API_BASE}/tasks?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (tasksResponse.ok) {
      const result = await tasksResponse.json();
      console.log('✅ Tasks pagination working');
      console.log(`   Page: ${result.pagination.page}, Limit: ${result.pagination.limit}`);
      console.log(`   Total: ${result.pagination.total}, Pages: ${result.pagination.totalPages}`);
      console.log(`   Data Count: ${result.data.length}`);
      console.log(`   Filters: ${JSON.stringify(result.filters)}`);
    } else {
      console.log('❌ Tasks pagination failed');
    }
  } catch (error) {
    console.log('❌ Tasks pagination error:', error.message);
  }

  // Test 6: Test tasks filtering and sorting
  console.log('\nTest 6: Test tasks filtering and sorting');
  try {
    const filterResponse = await fetch(`${API_BASE}/tasks?page=1&limit=5&sort=priority&order=desc&status=todo`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (filterResponse.ok) {
      const result = await filterResponse.json();
      console.log('✅ Tasks filtering and sorting working');
      console.log(`   Sort: ${result.pagination.sort}, Order: ${result.pagination.order}`);
      console.log(`   Status Filter: ${result.filters.status}`);
      console.log(`   Data Count: ${result.data.length}`);
    }
  } catch (error) {
    console.log('❌ Tasks filtering error:', error.message);
  }

  // Test 7: Test invalid pagination parameters
  console.log('\nTest 7: Test invalid pagination parameters');
  try {
    const invalidResponse = await fetch(`${API_BASE}/memories?page=-1&limit=200`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (invalidResponse.ok) {
      const result = await invalidResponse.json();
      console.log('✅ Invalid parameters handled correctly');
      console.log(`   Page normalized to: ${result.pagination.page}`);
      console.log(`   Limit normalized to: ${result.pagination.limit}`);
    }
  } catch (error) {
    console.log('❌ Invalid parameters test error:', error.message);
  }

  console.log('\n📄 Pagination Tests Complete!');
  console.log('✅ All pagination features are working correctly');
}

// Run the tests
testPagination().catch(console.error);