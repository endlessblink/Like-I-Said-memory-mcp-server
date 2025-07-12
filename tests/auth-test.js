#!/usr/bin/env node

/**
 * Authentication System Test
 * Tests the authentication endpoints and middleware
 */

import fetch from 'node-fetch';
import { AuthSystem } from '../lib/auth-system.js';

const API_BASE = 'http://localhost:3001/api';

async function testAuthentication() {
  console.log('🔐 Testing Authentication System...\n');

  let authToken = null;
  let refreshToken = null;
  
  try {
    // Test 1: Try accessing protected endpoint without auth (should fail)
    console.log('Test 1: Access protected endpoint without authentication');
    try {
      const response = await fetch(`${API_BASE}/memories`);
      if (response.status === 401) {
        console.log('✅ Protected endpoint properly blocked unauthorized access');
      } else {
        console.log('❌ Protected endpoint should have blocked unauthorized access');
      }
    } catch (error) {
      console.log('💡 Server may not be running. Please start with: npm run start:dashboard');
      return;
    }

    // Test 2: Login with default admin credentials
    console.log('\nTest 2: Login with admin credentials');
    try {
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'wgokTSxkY9U7' // Using the generated admin password
        })
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        authToken = loginData.accessToken;
        refreshToken = loginData.refreshToken;
        console.log('✅ Login successful');
        console.log(`   Token: ${authToken.substring(0, 20)}...`);
      } else {
        const error = await loginResponse.json();
        console.log('❌ Login failed:', error.error);
        console.log('💡 Check server logs for default admin password');
      }
    } catch (error) {
      console.log('❌ Login request failed:', error.message);
    }

    // Test 3: Access protected endpoint with auth token (if login worked)
    if (authToken) {
      console.log('\nTest 3: Access protected endpoint with authentication');
      try {
        const response = await fetch(`${API_BASE}/memories`, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('✅ Protected endpoint accessible with valid token');
        } else {
          console.log('❌ Protected endpoint should be accessible with valid token');
        }
      } catch (error) {
        console.log('❌ Protected endpoint access failed:', error.message);
      }

      // Test 4: Get current user info
      console.log('\nTest 4: Get current user info');
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ User info retrieved:', userData.user.username);
        } else {
          console.log('❌ Failed to get user info');
        }
      } catch (error) {
        console.log('❌ User info request failed:', error.message);
      }

      // Test 5: Refresh token
      if (refreshToken) {
        console.log('\nTest 5: Refresh access token');
        try {
          const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (response.ok) {
            const refreshData = await response.json();
            console.log('✅ Token refresh successful');
            authToken = refreshData.accessToken; // Update with new token
          } else {
            console.log('❌ Token refresh failed');
          }
        } catch (error) {
          console.log('❌ Token refresh request failed:', error.message);
        }
      }

      // Test 6: Logout
      console.log('\nTest 6: Logout');
      try {
        const response = await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('✅ Logout successful');
        } else {
          console.log('❌ Logout failed');
        }
      } catch (error) {
        console.log('❌ Logout request failed:', error.message);
      }
    }

    // Test 7: Test AuthSystem class directly
    console.log('\nTest 7: Direct AuthSystem class testing');
    try {
      const authSystem = new AuthSystem();
      const stats = authSystem.getAuthStats();
      console.log('✅ AuthSystem class working:', `${stats.totalUsers} users, ${stats.activeSessions} sessions`);
    } catch (error) {
      console.log('❌ AuthSystem class failed:', error.message);
    }

  } catch (error) {
    console.error('Test suite failed:', error);
  }

  console.log('\n🔐 Authentication Tests Complete!');
  console.log('\n💡 To test with the correct admin password:');
  console.log('   1. Start the server: npm run start:dashboard');
  console.log('   2. Check console for default admin password');
  console.log('   3. Use that password in the login test');
}

// Run the tests
testAuthentication().catch(console.error);