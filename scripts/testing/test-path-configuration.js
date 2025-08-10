#!/usr/bin/env node

/**
 * Comprehensive error testing script for path configuration functionality
 * Tests various error scenarios to ensure robust error handling
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

console.log('🧪 Like-I-Said Path Configuration Error Testing Suite\n');

// Test configuration
const API_BASE = 'http://localhost:3001';
const TEST_SCENARIOS = [
  {
    name: 'Non-existent directories',
    memoryPath: '/completely/fake/path/that/does/not/exist/memories',
    taskPath: '/another/fake/path/tasks',
    expectError: false, // Should accept but show as non-existent
  },
  {
    name: 'Invalid characters in path (Windows)',
    memoryPath: 'C:\\invalid<>path|with*chars\\memories',
    taskPath: 'C:\\bad?path"name\\tasks',
    expectError: true,
  },
  {
    name: 'Relative paths',
    memoryPath: './memories',
    taskPath: '../tasks',
    expectError: false, // Should work but resolve to absolute
  },
  {
    name: 'Empty paths',
    memoryPath: '',
    taskPath: '',
    expectError: true,
  },
  {
    name: 'Null/undefined paths',
    memoryPath: null,
    taskPath: undefined,
    expectError: true,
  },
  {
    name: 'Very long paths',
    memoryPath: 'C:\\' + 'a'.repeat(300) + '\\memories',
    taskPath: 'C:\\' + 'b'.repeat(300) + '\\tasks',
    expectError: true,
  },
  {
    name: 'Paths with special characters',
    memoryPath: '/home/user/like-i-said (special)/memories',
    taskPath: '/home/user/like-i-said [test]/tasks',
    expectError: false,
  },
  {
    name: 'Network paths (Windows UNC)',
    memoryPath: '\\\\server\\share\\memories',
    taskPath: '\\\\server\\share\\tasks',
    expectError: false,
  },
  {
    name: 'Paths with environment variables',
    memoryPath: '$HOME/memories',
    taskPath: '%USERPROFILE%\\tasks',
    expectError: false, // Should be resolved
  },
  {
    name: 'File instead of directory',
    memoryPath: __filename, // This script file
    taskPath: __filename,
    expectError: true,
  },
];

// Helper function to make API requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            error: e.message,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test each scenario
async function runTests() {
  console.log('🔍 Testing path configuration error scenarios...\n');

  // First, check if API server is running
  try {
    await makeRequest('GET', '/api/paths');
  } catch (error) {
    console.error('❌ API server is not running on port 3001');
    console.error('   Please start the dashboard with: npm run dev:full');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const scenario of TEST_SCENARIOS) {
    console.log(`📝 Test: ${scenario.name}`);
    console.log(`   Memory Path: ${scenario.memoryPath}`);
    console.log(`   Task Path: ${scenario.taskPath}`);

    try {
      const result = await makeRequest('POST', '/api/paths', {
        memoryPath: scenario.memoryPath,
        taskPath: scenario.taskPath,
      });

      if (scenario.expectError) {
        if (result.status >= 400) {
          console.log(`   ✅ Expected error received: ${result.data.error || result.data}`);
          passed++;
        } else {
          console.log(`   ❌ Expected error but got success`);
          failed++;
        }
      } else {
        if (result.status === 200) {
          console.log(`   ✅ Success as expected`);
          passed++;
        } else {
          console.log(`   ❌ Expected success but got error: ${result.data.error || result.data}`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  // Test concurrent access
  console.log('📝 Test: Concurrent path updates');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        makeRequest('POST', '/api/paths', {
          memoryPath: `/test/concurrent/${i}/memories`,
          taskPath: `/test/concurrent/${i}/tasks`,
        })
      );
    }
    
    const results = await Promise.all(promises);
    const allSuccessful = results.every(r => r.status === 200);
    
    if (allSuccessful) {
      console.log('   ✅ All concurrent requests succeeded');
      passed++;
    } else {
      console.log('   ❌ Some concurrent requests failed');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Concurrent test failed: ${error.message}`);
    failed++;
  }

  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${passed + failed}`);

  // Test permission scenarios (if running as root/admin)
  console.log('\n🔒 Permission Tests:');
  console.log('   Note: Some permission tests require admin/root access');
  
  // Test read-only directory
  if (process.platform !== 'win32') {
    try {
      const readOnlyDir = '/tmp/like-i-said-readonly-test';
      if (fs.existsSync(readOnlyDir)) {
        fs.rmSync(readOnlyDir, { recursive: true });
      }
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only
      
      const result = await makeRequest('POST', '/api/paths', {
        memoryPath: path.join(readOnlyDir, 'memories'),
        taskPath: path.join(readOnlyDir, 'tasks'),
      });
      
      console.log('   Read-only directory test:', result.status === 200 ? '✅ Handled' : '❌ Failed');
      
      // Cleanup
      fs.chmodSync(readOnlyDir, 0o755);
      fs.rmSync(readOnlyDir, { recursive: true });
    } catch (error) {
      console.log('   Read-only directory test: ⚠️  Skipped (permission error)');
    }
  }

  // Test symlink handling
  console.log('\n🔗 Symlink Tests:');
  try {
    const realDir = '/tmp/like-i-said-real';
    const symlinkDir = '/tmp/like-i-said-symlink';
    
    if (fs.existsSync(realDir)) fs.rmSync(realDir, { recursive: true });
    if (fs.existsSync(symlinkDir)) fs.unlinkSync(symlinkDir);
    
    fs.mkdirSync(realDir, { recursive: true });
    fs.symlinkSync(realDir, symlinkDir);
    
    const result = await makeRequest('POST', '/api/paths', {
      memoryPath: path.join(symlinkDir, 'memories'),
      taskPath: path.join(symlinkDir, 'tasks'),
    });
    
    console.log('   Symlink directory test:', result.status === 200 ? '✅ Handled' : '❌ Failed');
    
    // Cleanup
    fs.unlinkSync(symlinkDir);
    fs.rmSync(realDir, { recursive: true });
  } catch (error) {
    console.log('   Symlink directory test: ⚠️  Skipped (not supported on this system)');
  }

  console.log('\n✨ Testing complete!');
}

// Run the tests
runTests().catch(console.error);