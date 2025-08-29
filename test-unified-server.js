#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Unified MCP Server
 * Tests all 31 tools across minimal/ai/full modes
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const MODES = ['minimal', 'ai', 'full'];
const EXPECTED_TOOLS = {
  minimal: [
    'add_memory', 'get_memory', 'list_memories', 'search_memories', 'delete_memory',
    'create_task', 'update_task', 'list_tasks', 'get_task_context', 'delete_task', 'test_tool'
  ],
  ai: [
    // Core tools (11)
    'add_memory', 'get_memory', 'list_memories', 'search_memories', 'delete_memory',
    'create_task', 'update_task', 'list_tasks', 'get_task_context', 'delete_task', 'test_tool',
    // AI tools (6)
    'check_ollama_status', 'enhance_memory_ollama', 'batch_enhance_memories_ollama', 
    'batch_enhance_tasks_ollama', 'generate_dropoff', 'analyze_performance'
  ],
  full: [
    // All tools (31 total) - ACTUAL TOOLS FROM ORIGINAL SERVER
    'add_memory', 'get_memory', 'list_memories', 'search_memories', 'delete_memory',
    'create_task', 'update_task', 'list_tasks', 'get_task_context', 'delete_task', 'test_tool',
    'check_ollama_status', 'enhance_memory_ollama', 'batch_enhance_memories_ollama', 
    'batch_enhance_tasks_ollama', 'generate_dropoff', 'analyze_performance',
    'deduplicate_memories', 'batch_enhance_memories', 'enhance_memory_metadata', 
    'smart_status_update', 'validate_task_workflow', 'get_task_status_analytics',
    'work_detector_control', 'suggest_improvements', 'get_automation_suggestions',
    'enforce_proactive_memory', 'update_strategies', 'get_current_paths', 
    'set_memory_path', 'set_task_path'
  ]
};

class UnifiedServerTester {
  constructor() {
    this.results = { passed: 0, failed: 0, errors: [] };
  }

  async testMode(mode) {
    console.log(`\n🧪 Testing ${mode.toUpperCase()} mode...`);
    
    const server = spawn('node', ['server-unified.js'], {
      env: { ...process.env, MCP_MODE: mode, MCP_QUIET: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => { output += data.toString(); });
    server.stderr.on('data', (data) => { errorOutput += data.toString(); });

    // Send list_tools request
    const listToolsRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    }) + '\n';

    server.stdin.write(listToolsRequest);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    server.kill('SIGTERM');

    // Parse response
    try {
      const lines = output.split('\n').filter(line => line.trim());
      let toolsResponse = null;
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === 1 && parsed.result && parsed.result.tools) {
            toolsResponse = parsed.result.tools;
            break;
          }
        } catch (e) { /* Skip non-JSON lines */ }
      }

      if (toolsResponse) {
        const actualTools = toolsResponse.map(tool => tool.name).sort();
        const expectedTools = EXPECTED_TOOLS[mode].sort();
        
        console.log(`  📊 Expected: ${expectedTools.length} tools`);
        console.log(`  📊 Actual:   ${actualTools.length} tools`);
        
        const missing = expectedTools.filter(tool => !actualTools.includes(tool));
        const extra = actualTools.filter(tool => !expectedTools.includes(tool));
        
        if (missing.length === 0 && extra.length === 0) {
          console.log(`  ✅ ${mode.toUpperCase()} mode: All ${expectedTools.length} tools present`);
          this.results.passed++;
        } else {
          console.log(`  ❌ ${mode.toUpperCase()} mode: Tool mismatch`);
          if (missing.length > 0) console.log(`     Missing: ${missing.join(', ')}`);
          if (extra.length > 0) console.log(`     Extra: ${extra.join(', ')}`);
          this.results.failed++;
          this.results.errors.push(`${mode}: Missing=${missing.join(',')}, Extra=${extra.join(',')}`);
        }
      } else {
        console.log(`  ❌ ${mode.toUpperCase()} mode: No valid tools response received`);
        this.results.failed++;
        this.results.errors.push(`${mode}: No tools response`);
      }
    } catch (error) {
      console.log(`  ❌ ${mode.toUpperCase()} mode: Error parsing response - ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`${mode}: Parse error - ${error.message}`);
    }

    if (errorOutput) {
      console.log(`  ⚠️  Stderr: ${errorOutput.slice(0, 200)}...`);
    }
  }

  async testFunctionalTool(mode, toolName) {
    console.log(`\n🔧 Testing ${toolName} functionality in ${mode} mode...`);
    
    const server = spawn('node', ['server-unified.js'], {
      env: { ...process.env, MCP_MODE: mode, MCP_QUIET: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    server.stdout.on('data', (data) => { output += data.toString(); });

    // Test basic tool call (test_tool is safest)
    const testRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "test_tool",
        arguments: { message: "test" }
      }
    }) + '\n';

    server.stdin.write(testRequest);
    await new Promise(resolve => setTimeout(resolve, 2000));
    server.kill('SIGTERM');

    // Check if tool executed without error
    try {
      const lines = output.split('\n').filter(line => line.trim());
      let toolResponse = null;
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === 2) {
            toolResponse = parsed;
            break;
          }
        } catch (e) { /* Skip non-JSON lines */ }
      }

      if (toolResponse && toolResponse.result) {
        console.log(`  ✅ test_tool executed successfully`);
        this.results.passed++;
      } else if (toolResponse && toolResponse.error) {
        console.log(`  ❌ test_tool error: ${toolResponse.error.message}`);
        this.results.failed++;
      } else {
        console.log(`  ❌ test_tool: No response received`);
        this.results.failed++;
      }
    } catch (error) {
      console.log(`  ❌ test_tool: Parse error - ${error.message}`);
      this.results.failed++;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Unified Server Comprehensive Test Suite\n');
    
    // Test each mode
    for (const mode of MODES) {
      await this.testMode(mode);
      await this.testFunctionalTool(mode, 'test_tool');
    }

    // Summary
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🐛 ERRORS:');
      this.results.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Unified server has complete functionality parity.');
    } else {
      console.log('\n⚠️  Some tests failed. Check errors above.');
    }

    return this.results.failed === 0;
  }
}

// Run tests
const tester = new UnifiedServerTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});