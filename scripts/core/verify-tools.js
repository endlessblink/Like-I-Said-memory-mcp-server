#!/usr/bin/env node

/**
 * Verify Tools Script
 * 
 * This script verifies that the MCP server is properly configured and all 27 tools are available.
 * It simulates an MCP client connection and lists all available tools.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying Like-I-Said MCP Server Tools...\n');

// Expected tools list
const expectedTools = [
  // Memory Tools (6)
  'add_memory',
  'get_memory',
  'list_memories',
  'delete_memory',
  'search_memories',
  'test_tool',
  
  // Task Management Tools (6)
  'create_task',
  'update_task',
  'list_tasks',
  'get_task_context',
  'delete_task',
  'generate_dropoff',
  
  // Enhancement Tools (4)
  'enhance_memory_metadata',
  'batch_enhance_memories',
  'enhance_memory_ollama',
  'batch_enhance_memories_ollama',
  
  // Task Enhancement Tools (2)
  'batch_enhance_tasks_ollama',
  'check_ollama_status',
  
  // Intelligence Tools (5)
  'smart_status_update',
  'get_task_status_analytics',
  'validate_task_workflow',
  'get_automation_suggestions',
  'deduplicate_memories',
  
  // System Tools (4)
  'work_detector_control',
  'set_memory_path',
  'set_task_path',
  'get_current_paths'
];

// Start the server
const serverPath = join(__dirname, '..', 'server-markdown.js');
const child = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, MCP_MODE: 'true', MCP_QUIET: 'true' }
});

let output = '';
let errorOutput = '';
let toolsReceived = false;

child.stdout.on('data', (data) => {
  output += data.toString();
  
  // Try to parse each line as JSON
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim() && line.includes('jsonrpc')) {
      try {
        const response = JSON.parse(line);
        if (response.result && response.result.tools) {
          toolsReceived = true;
          const tools = response.result.tools;
          
          console.log(`✅ Found ${tools.length} tools\n`);
          
          // Check for missing tools
          const foundToolNames = tools.map(t => t.name);
          const missingTools = expectedTools.filter(name => !foundToolNames.includes(name));
          const extraTools = foundToolNames.filter(name => !expectedTools.includes(name));
          
          if (missingTools.length === 0 && tools.length === 27) {
            console.log('🎉 All 27 expected tools are available!\n');
          } else {
            console.log(`⚠️  Expected 27 tools but found ${tools.length}\n`);
            
            if (missingTools.length > 0) {
              console.log('❌ Missing tools:');
              missingTools.forEach(tool => console.log(`   - ${tool}`));
              console.log('');
            }
            
            if (extraTools.length > 0) {
              console.log('➕ Extra tools found:');
              extraTools.forEach(tool => console.log(`   - ${tool}`));
              console.log('');
            }
          }
          
          // Group tools by category
          console.log('📋 Tool Categories:\n');
          
          const categories = {
            'Memory Tools': ['add_memory', 'get_memory', 'list_memories', 'delete_memory', 'search_memories', 'test_tool'],
            'Task Management': ['create_task', 'update_task', 'list_tasks', 'get_task_context', 'delete_task', 'generate_dropoff'],
            'Enhancement Tools': ['enhance_memory_metadata', 'batch_enhance_memories', 'enhance_memory_ollama', 'batch_enhance_memories_ollama', 'batch_enhance_tasks_ollama', 'check_ollama_status'],
            'Intelligence Tools': ['smart_status_update', 'get_task_status_analytics', 'validate_task_workflow', 'get_automation_suggestions', 'deduplicate_memories'],
            'System Tools': ['work_detector_control', 'set_memory_path', 'set_task_path', 'get_current_paths']
          };
          
          for (const [category, categoryTools] of Object.entries(categories)) {
            const foundInCategory = categoryTools.filter(t => foundToolNames.includes(t));
            console.log(`${category} (${foundInCategory.length}/${categoryTools.length}):`);
            foundInCategory.forEach(tool => {
              const toolDef = tools.find(t => t.name === tool);
              console.log(`  ✓ ${tool}`);
            });
            console.log('');
          }
          
          child.kill();
        }
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
  }
});

child.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

// Send MCP initialization
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'tool-verifier',
        version: '1.0.0'
      }
    }
  }) + '\n');
}, 100);

// Request tools list
setTimeout(() => {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  }) + '\n');
}, 500);

// Timeout after 3 seconds
setTimeout(() => {
  if (!toolsReceived) {
    console.log('❌ Timeout: No tools response received from server\n');
    if (errorOutput) {
      console.log('Error output:', errorOutput);
    }
  }
  child.kill();
  process.exit(toolsReceived ? 0 : 1);
}, 3000);

child.on('exit', (code) => {
  if (code !== 0 && !toolsReceived) {
    console.log(`\n❌ Server exited with code ${code}`);
    if (errorOutput) {
      console.log('Error output:', errorOutput);
    }
  }
});