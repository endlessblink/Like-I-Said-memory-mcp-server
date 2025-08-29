#!/usr/bin/env node

/**
 * Claude Code MCP Simulator
 * Tests the unified server exactly like Claude Code would
 * 100% safe - no config changes needed
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

class ClaudeCodeSimulator {
  constructor() {
    this.server = null;
    this.isConnected = false;
    this.messageId = 0;
    this.responses = new Map();
  }

  async startServer(mode = 'minimal') {
    console.log(`🚀 Starting unified server in ${mode} mode...`);
    
    this.server = spawn('node', ['server-unified.js'], {
      env: { ...process.env, MCP_MODE: mode, MCP_QUIET: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    this.server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse JSON-RPC responses
      const lines = text.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id !== undefined) {
            this.responses.set(response.id, response);
          }
        } catch (e) {
          // Skip non-JSON lines (startup messages)
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      console.log(`Server stderr: ${data}`);
    });

    // Wait for server startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (this.server.killed) {
      throw new Error('Server failed to start');
    }
    
    console.log('✅ Server started successfully');
    return true;
  }

  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    const request = {
      jsonrpc: "2.0",
      method: method,
      params: params,
      id: id
    };

    console.log(`📤 Sending: ${method}`);
    this.server.stdin.write(JSON.stringify(request) + '\n');

    // Wait for response
    let attempts = 0;
    while (attempts < 50 && !this.responses.has(id)) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.responses.has(id)) {
      throw new Error(`No response received for ${method} after 5 seconds`);
    }

    const response = this.responses.get(id);
    this.responses.delete(id);
    
    console.log(`📥 Response: ${response.error ? 'ERROR' : 'SUCCESS'}`);
    return response;
  }

  async testInitialize() {
    console.log('\n🔌 Testing MCP Initialization...');
    const response = await this.sendRequest('initialize', {
      protocolVersion: "1.0.0",
      clientInfo: { name: "claude-code-simulator", version: "1.0.0" },
      capabilities: {}
    });

    if (response.error) {
      throw new Error(`Initialize failed: ${JSON.stringify(response.error)}`);
    }

    console.log(`✅ Protocol version: ${response.result.protocolVersion}`);
    console.log(`✅ Server: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
    this.isConnected = true;
    return true;
  }

  async testToolsList() {
    console.log('\n🔧 Testing Tools List...');
    const response = await this.sendRequest('tools/list');

    if (response.error) {
      throw new Error(`Tools list failed: ${JSON.stringify(response.error)}`);
    }

    const tools = response.result.tools;
    console.log(`✅ Found ${tools.length} tools`);
    
    // Validate expected tools for minimal mode
    const expectedTools = [
      'add_memory', 'get_memory', 'list_memories', 'search_memories', 'delete_memory',
      'create_task', 'update_task', 'list_tasks', 'get_task_context', 'delete_task', 'test_tool'
    ];

    const actualTools = tools.map(t => t.name);
    const missing = expectedTools.filter(tool => !actualTools.includes(tool));
    
    if (missing.length > 0) {
      throw new Error(`Missing tools: ${missing.join(', ')}`);
    }

    console.log('✅ All expected tools present');
    return tools;
  }

  async testToolExecution() {
    console.log('\n🎯 Testing Tool Execution...');
    const response = await this.sendRequest('tools/call', {
      name: 'test_tool',
      arguments: { message: 'Claude Code simulation test' }
    });

    if (response.error) {
      throw new Error(`Tool execution failed: ${JSON.stringify(response.error)}`);
    }

    console.log('✅ Tool execution successful');
    console.log(`Response: ${JSON.stringify(response.result, null, 2)}`);
    return true;
  }

  async testMemoryOperations() {
    console.log('\n🧠 Testing Memory Operations...');
    
    // Test add_memory
    console.log('Testing add_memory...');
    const addResponse = await this.sendRequest('tools/call', {
      name: 'add_memory',
      arguments: { 
        content: 'Test memory from Claude Code simulator',
        project: 'testing',
        tags: ['test', 'simulation']
      }
    });

    if (addResponse.error) {
      throw new Error(`Add memory failed: ${JSON.stringify(addResponse.error)}`);
    }

    console.log('✅ Memory added successfully');
    
    // Test list_memories
    console.log('Testing list_memories...');
    const listResponse = await this.sendRequest('tools/call', {
      name: 'list_memories',
      arguments: { project: 'testing' }
    });

    if (listResponse.error) {
      throw new Error(`List memories failed: ${JSON.stringify(listResponse.error)}`);
    }

    const memories = listResponse.result.content || [];
    const memoryText = Array.isArray(memories) ? memories[0]?.text || '' : (memories.text || '');
    const memoryCount = memoryText.split('## Memory').length - 1;
    console.log(`✅ Found ${memoryCount} memories`);
    return true;
  }

  async testTaskOperations() {
    console.log('\n📋 Testing Task Operations...');
    
    // Test create_task
    console.log('Testing create_task...');
    const createResponse = await this.sendRequest('tools/call', {
      name: 'create_task',
      arguments: { 
        title: 'Test task from simulator',
        description: 'Testing Claude Code integration',
        project: 'testing',
        priority: 'medium'
      }
    });

    if (createResponse.error) {
      throw new Error(`Create task failed: ${JSON.stringify(createResponse.error)}`);
    }

    console.log('✅ Task created successfully');
    
    // Test list_tasks
    console.log('Testing list_tasks...');
    const listResponse = await this.sendRequest('tools/call', {
      name: 'list_tasks',
      arguments: { project: 'testing' }
    });

    if (listResponse.error) {
      throw new Error(`List tasks failed: ${JSON.stringify(listResponse.error)}`);
    }

    const tasks = listResponse.result.content || [];
    const taskText = Array.isArray(tasks) ? tasks[0]?.text || '' : (tasks.text || '');
    const taskCount = taskText.split('## Task').length - 1;
    console.log(`✅ Found ${taskCount} tasks`);
    return true;
  }

  async testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');
    
    // Test invalid tool call
    const response = await this.sendRequest('tools/call', {
      name: 'nonexistent_tool',
      arguments: {}
    });

    if (!response.error) {
      throw new Error('Expected error for invalid tool, but got success');
    }

    console.log('✅ Error handling working correctly');
    console.log(`Error: ${response.error.message}`);
    return true;
  }

  async testStressConditions() {
    console.log('\n💪 Testing Stress Conditions...');
    
    // Send multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(this.sendRequest('tools/call', {
        name: 'test_tool',
        arguments: { message: `Concurrent test ${i}` }
      }));
    }

    const results = await Promise.all(promises);
    const successful = results.filter(r => !r.error).length;
    
    console.log(`✅ ${successful}/5 concurrent requests successful`);
    
    if (successful < 4) {
      throw new Error('Stress test failed - too many concurrent failures');
    }

    return true;
  }

  async shutdown() {
    console.log('\n🔌 Shutting down server...');
    if (this.server && !this.server.killed) {
      this.server.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        this.server.on('exit', resolve);
        setTimeout(() => {
          this.server.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }
    console.log('✅ Server shut down');
  }

  async runCompleteTest(mode = 'minimal') {
    const startTime = Date.now();
    
    try {
      console.log('╔══════════════════════════════════════════╗');
      console.log('║     CLAUDE CODE MCP SIMULATOR v1.0      ║');
      console.log('║   Safe testing without config changes   ║');
      console.log('╚══════════════════════════════════════════╝');
      
      await this.startServer(mode);
      await this.testInitialize();
      await this.testToolsList();
      await this.testToolExecution();
      await this.testMemoryOperations();
      await this.testTaskOperations();
      await this.testErrorHandling();
      await this.testStressConditions();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║               TEST RESULTS               ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log(`✅ ALL TESTS PASSED in ${duration}s`);
      console.log('🎉 Server is ready for Claude Code integration!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run: ./test-mcp-safely.sh install');
      console.log('2. Restart Claude Code');
      console.log('3. Test in a conversation');
      console.log('4. Run: ./test-mcp-safely.sh remove (when done)');
      
      return true;
      
    } catch (error) {
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║               TEST FAILED                ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log(`❌ Error: ${error.message}`);
      console.log('🚨 DO NOT install in Claude Code yet!');
      
      return false;
      
    } finally {
      await this.shutdown();
    }
  }
}

// Run simulation
const mode = process.argv[2] || 'minimal';
const simulator = new ClaudeCodeSimulator();

simulator.runCompleteTest(mode).then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Simulator crashed:', error);
  process.exit(1);
});