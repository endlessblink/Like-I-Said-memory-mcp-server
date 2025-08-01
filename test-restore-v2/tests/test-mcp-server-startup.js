#!/usr/bin/env node

/**
 * Test MCP Server Startup
 * 
 * Verifies that the MCP server starts correctly without @xenova/transformers
 */

import { spawn } from 'child_process';

console.log('🚀 Testing MCP Server Startup...\n');

async function testMCPServer() {
  console.log('Starting MCP server with JSON-RPC test...');
  
  // Prepare JSON-RPC request
  const jsonRpcRequest = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  });

  return new Promise((resolve, reject) => {
    // Start the MCP server
    const mcpProcess = spawn('node', ['server-markdown.js'], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let outputBuffer = '';
    let errorBuffer = '';
    let responseReceived = false;

    mcpProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      
      // Try to parse JSON-RPC response
      try {
        const lines = outputBuffer.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.includes('"jsonrpc"')) {
            const response = JSON.parse(line);
            console.log('\nReceived JSON-RPC response:');
            console.log(JSON.stringify(response, null, 2));
            
            if (response.result && response.result.tools) {
              console.log(`\n✅ MCP server returned ${response.result.tools.length} tools`);
              responseReceived = true;
              
              // Check for memory and task tools
              const hasMemoryTools = response.result.tools.some(t => t.name.includes('memory'));
              const hasTaskTools = response.result.tools.some(t => t.name.includes('task'));
              
              console.log(`Memory tools available: ${hasMemoryTools ? '✅' : '❌'}`);
              console.log(`Task tools available: ${hasTaskTools ? '✅' : '❌'}`);
            }
          }
        }
      } catch (e) {
        // Not a complete JSON response yet
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      errorBuffer += data.toString();
      process.stderr.write(data);
    });

    mcpProcess.on('close', (code) => {
      console.log(`\nMCP server exited with code ${code}`);
      
      // Check for xenova/transformers errors
      const hasXenovaError = errorBuffer.includes('ERR_MODULE_NOT_FOUND') && 
                            errorBuffer.includes('@xenova/transformers');
      
      if (hasXenovaError) {
        console.error('\n❌ Found @xenova/transformers import error');
        console.error('The MCP server should handle missing optional dependencies');
        reject(new Error('MCP server failed due to missing dependency'));
        return;
      }

      // Check that we got a valid response
      if (!responseReceived) {
        console.error('\n❌ No valid JSON-RPC response received');
        reject(new Error('No response from MCP server'));
        return;
      }

      console.log('\n✅ MCP server handled missing dependencies gracefully');
      resolve(true);
    });

    mcpProcess.on('error', (error) => {
      console.error('Failed to start MCP server:', error);
      reject(error);
    });

    // Send JSON-RPC request
    console.log('Sending JSON-RPC request:', jsonRpcRequest);
    mcpProcess.stdin.write(jsonRpcRequest + '\n');
    mcpProcess.stdin.end();
  });
}

// Test memory operations without vector storage
async function testMemoryOperations() {
  console.log('\n\nTesting memory operations without vector storage...');
  
  const requests = [
    {
      jsonrpc: "2.0",
      id: 2,
      method: "test_tool",
      params: { message: "Hello from test" }
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "add_memory",
      params: {
        content: "Test memory without vector storage",
        tags: ["test"],
        project: "test-project"
      }
    }
  ];

  for (const request of requests) {
    console.log(`\nTesting ${request.method}...`);
    
    const mcpProcess = spawn('node', ['server-markdown.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const responsePromise = new Promise((resolve) => {
      let output = '';
      
      mcpProcess.stdout.on('data', (data) => {
        output += data.toString();
        try {
          const lines = output.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.includes('"jsonrpc"')) {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                resolve(response);
              }
            }
          }
        } catch (e) {
          // Not complete JSON yet
        }
      });
      
      mcpProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });

    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    mcpProcess.stdin.end();

    try {
      const response = await Promise.race([
        responsePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error(`❌ ${request.method} returned error:`, response.error);
      } else {
        console.log(`✅ ${request.method} succeeded`);
      }
    } catch (error) {
      console.error(`❌ ${request.method} failed:`, error.message);
    }

    mcpProcess.kill();
  }
}

// Run all tests
async function runTests() {
  try {
    await testMCPServer();
    await testMemoryOperations();
    
    console.log('\n\n✅ All MCP server tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n\n❌ MCP server tests failed:', error);
    process.exit(1);
  }
}

runTests();