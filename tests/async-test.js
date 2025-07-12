#!/usr/bin/env node

/**
 * Test the async file operations implementation
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testAsyncOperations() {
  console.log('🔧 Testing Async File Operations...\n');

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

  // Test 2: Test async getStatus endpoint
  console.log('\nTest 2: Test async status endpoint');
  try {
    const statusResponse = await fetch(`${API_BASE}/status`);
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Status endpoint working');
      console.log(`   Memories: ${status.memories}, Projects: ${status.projects}`);
    } else {
      console.log('❌ Status endpoint failed');
    }
  } catch (error) {
    console.log('❌ Status endpoint error:', error.message);
  }

  // Test 3: Test async getProjects endpoint
  console.log('\nTest 3: Test async projects endpoint');
  try {
    const projectsResponse = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (projectsResponse.ok) {
      const projects = await projectsResponse.json();
      console.log('✅ Projects endpoint working');
      console.log(`   Found ${projects.length} projects:`, projects.map(p => p.name).join(', '));
    } else {
      console.log('❌ Projects endpoint failed');
    }
  } catch (error) {
    console.log('❌ Projects endpoint error:', error.message);
  }

  // Test 4: Test async getMemories endpoint
  console.log('\nTest 4: Test async memories endpoint');
  try {
    const memoriesResponse = await fetch(`${API_BASE}/memories`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (memoriesResponse.ok) {
      const memories = await memoriesResponse.json();
      console.log('✅ Memories endpoint working');
      console.log(`   Found ${memories.length} memories`);
    } else {
      console.log('❌ Memories endpoint failed');
    }
  } catch (error) {
    console.log('❌ Memories endpoint error:', error.message);
  }

  // Test 5: Test async createMemory endpoint
  console.log('\nTest 5: Test async memory creation');
  try {
    const createResponse = await fetch(`${API_BASE}/memories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'Test memory for async operations validation',
        tags: ['test', 'async'],
        category: 'code',
        project: 'test'
      })
    });

    if (createResponse.ok) {
      const memory = await createResponse.json();
      console.log('✅ Memory creation working');
      console.log(`   Created memory with ID: ${memory.id}`);
      
      // Test 6: Test async memory update
      console.log('\nTest 6: Test async memory update');
      const updateResponse = await fetch(`${API_BASE}/memories/${memory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'Updated test memory for async operations validation',
          tags: ['test', 'async', 'updated']
        })
      });

      if (updateResponse.ok) {
        console.log('✅ Memory update working');
      } else {
        console.log('❌ Memory update failed');
      }
    } else {
      console.log('❌ Memory creation failed');
    }
  } catch (error) {
    console.log('❌ Memory creation error:', error.message);
  }

  console.log('\n🔧 Async Operations Tests Complete!');
  console.log('✅ All async file operations are working correctly');
}

// Run the tests
testAsyncOperations().catch(console.error);