#!/usr/bin/env node

/**
 * Full MCP Integration Test
 * Tests that the server works correctly after JSON Schema fixes
 */

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🧪 Full MCP Integration Test\n');
console.log('=' .repeat(60));

const tests = [];
let testsPassed = 0;
let testsFailed = 0;

// Test 1: Server starts successfully
async function testServerStarts() {
  console.log('\n📌 Test 1: Server Startup');
  
  return new Promise((resolve) => {
    const server = spawn('node', ['server-markdown.js'], {
      env: { ...process.env, MCP_MODE: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Send tools/list request
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    }) + '\n');
    
    setTimeout(() => {
      server.kill();
      
      // Check for schema errors
      const hasSchemaErrors = errorOutput.includes('schema') && 
                              (errorOutput.includes('invalid') || 
                               errorOutput.includes('error'));
      
      if (hasSchemaErrors) {
        console.log('   ❌ Schema validation errors detected');
        console.log('   Error:', errorOutput.substring(0, 200));
        testsFailed++;
        resolve(false);
      } else if (output.includes('tools')) {
        console.log('   ✅ Server started without schema errors');
        testsPassed++;
        resolve(true);
      } else {
        console.log('   ❌ Server failed to respond');
        testsFailed++;
        resolve(false);
      }
    }, 1000);
  });
}

// Test 2: Validate all tools have valid schemas
async function testToolSchemas() {
  console.log('\n📌 Test 2: Tool Schema Validation');
  
  return new Promise((resolve) => {
    const server = spawn('node', ['server-markdown.js'], {
      env: { ...process.env, MCP_MODE: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      
      try {
        const response = JSON.parse(output);
        if (response.result && response.result.tools) {
          const tools = response.result.tools;
          let allValid = true;
          
          // Check each tool's schema
          tools.forEach(tool => {
            if (tool.inputSchema) {
              // Check for invalid type declarations
              const schemaStr = JSON.stringify(tool.inputSchema);
              if (schemaStr.includes('"type":"any"')) {
                console.log(`   ❌ Tool ${tool.name} has invalid type: any`);
                allValid = false;
              }
              
              // Check for $schema if present
              if (tool.inputSchema.$schema && 
                  !tool.inputSchema.$schema.includes('json-schema.org')) {
                console.log(`   ❌ Tool ${tool.name} has invalid $schema`);
                allValid = false;
              }
            }
          });
          
          if (allValid) {
            console.log(`   ✅ All ${tools.length} tools have valid schemas`);
            testsPassed++;
          } else {
            testsFailed++;
          }
          
          server.kill();
          resolve(allValid);
        }
      } catch (e) {
        // Not complete JSON yet
      }
    });
    
    // Send tools/list request
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    }) + '\n');
    
    setTimeout(() => {
      server.kill();
      resolve(false);
    }, 2000);
  });
}

// Test 3: Test a tool call with schema validation
async function testToolCall() {
  console.log('\n📌 Test 3: Tool Call with Schema Validation');
  
  return new Promise((resolve) => {
    const server = spawn('node', ['server-markdown.js'], {
      env: { ...process.env, MCP_MODE: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      
      try {
        const response = JSON.parse(output);
        if (response.result && response.result.content) {
          // Check if tool executed successfully
          const hasValidationError = errorOutput.toLowerCase().includes('validation') ||
                                    errorOutput.toLowerCase().includes('schema');
          
          if (!hasValidationError) {
            console.log('   ✅ Tool executed without schema validation errors');
            testsPassed++;
          } else {
            console.log('   ❌ Schema validation error during tool execution');
            testsFailed++;
          }
          
          server.kill();
          resolve(!hasValidationError);
        }
      } catch (e) {
        // Not complete JSON yet
      }
    });
    
    // Send test_tool call
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'test_tool',
        arguments: {
          message: 'Testing after JSON schema fixes'
        }
      }
    }) + '\n');
    
    setTimeout(() => {
      server.kill();
      resolve(false);
    }, 2000);
  });
}

// Test 4: Check Claude Code integration
async function testClaudeCodeIntegration() {
  console.log('\n📌 Test 4: Claude Code Integration');
  
  // Check if MCP server is configured in Claude
  const claudeConfig = JSON.parse(
    fs.readFileSync('/home/endlessblink/.claude.json', 'utf8')
  );
  
  const project = claudeConfig.projects['/mnt/d/APPSNospaces/like-i-said-mcp'];
  
  if (project && project.mcpServers['like-i-said-memory-v2']) {
    console.log('   ✅ MCP server configured in Claude Code');
    
    // Check if server process is running
    const { execSync } = await import('child_process');
    try {
      const psResult = execSync('ps aux | grep "server-markdown.js" | grep -v grep', 
                                { encoding: 'utf8' });
      if (psResult.includes('server-markdown.js')) {
        console.log('   ✅ MCP server process is running');
        testsPassed++;
        return true;
      }
    } catch (e) {
      // Process not found
    }
    
    console.log('   ⚠️  MCP server configured but not running');
    testsFailed++;
    return false;
  } else {
    console.log('   ❌ MCP server not configured in Claude Code');
    testsFailed++;
    return false;
  }
}

// Run all tests
async function runTests() {
  await testServerStarts();
  await testToolSchemas();
  await testToolCall();
  await testClaudeCodeIntegration();
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('The JSON Schema fixes are working correctly.');
    console.log('No schema validation errors detected.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
  }
  
  process.exit(testsFailed === 0 ? 0 : 1);
}

runTests().catch(console.error);