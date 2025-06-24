#!/usr/bin/env node

/**
 * Test script for MCP HTTP wrapper
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
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

async function runTests() {
  console.log('🧪 Testing MCP HTTP Wrapper\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Health Check');
    const health = await makeRequest('/health');
    console.log(`Status: ${health.status}`);
    console.log(`Response:`, health.data);
    console.log();

    // Test 2: Tools list
    console.log('2️⃣ Tools List');
    const tools = await makeRequest('/mcp/tools');
    console.log(`Status: ${tools.status}`);
    console.log(`Tools found: ${tools.data.tools?.length || 0}`);
    tools.data.tools?.forEach(tool => console.log(`  - ${tool.name}: ${tool.description}`));
    console.log();

    // Test 3: Test tool call
    console.log('3️⃣ Test Tool Call');
    const testCall = await makeRequest('/mcp', 'POST', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'test_tool',
        arguments: {
          message: 'HTTP wrapper integration test'
        }
      }
    });
    console.log(`Status: ${testCall.status}`);
    console.log(`Response:`, testCall.data);
    console.log();

    // Test 4: Add memory test
    console.log('4️⃣ Add Memory Test');
    const addMemory = await makeRequest('/mcp', 'POST', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_memory',
        arguments: {
          content: 'Test memory from HTTP wrapper',
          category: 'work',
          project: 'smithery-test'
        }
      }
    });
    console.log(`Status: ${addMemory.status}`);
    console.log(`Response:`, addMemory.data);
    console.log();

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();