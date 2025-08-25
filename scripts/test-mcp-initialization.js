#!/usr/bin/env node

/**
 * Test script to verify MCP auto-initialization functionality
 * This tests both the server startup and task hierarchy validation
 */

import { getTaskManager, verifyTaskManagerInitialization } from '../lib/v3-mcp-tools.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing MCP Auto-initialization and Task Hierarchy');
console.log('=' + '='.repeat(55));

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (error) {
      console.log(`   Error: ${error.message || error}`);
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

async function testTaskManagerInitialization() {
  console.log('\n📊 Testing TaskManager Initialization...');
  
  try {
    // Test 1: TaskManager initialization
    const verification = await verifyTaskManagerInitialization();
    logTest('TaskManager verification', verification.status === 'success', 
           verification.status === 'error' ? verification.message : null);
    
    // Test 2: Get TaskManager instance
    const taskManager = await getTaskManager();
    logTest('TaskManager instance creation', !!taskManager, 
           !taskManager ? 'TaskManager is null' : null);
    
    // Test 3: Database connection verification
    if (taskManager && typeof taskManager.verifyConnection === 'function') {
      try {
        await taskManager.verifyConnection();
        logTest('Database connection verification', true);
      } catch (error) {
        logTest('Database connection verification', false, error);
      }
    } else {
      logTest('Database connection verification', false, 
             'verifyConnection method not available');
    }
    
    return taskManager;
  } catch (error) {
    logTest('TaskManager initialization overall', false, error);
    return null;
  }
}

async function testTaskHierarchy(taskManager) {
  if (!taskManager) {
    console.log('\n⏭️  Skipping hierarchy tests - TaskManager not available');
    return;
  }
  
  console.log('\n🏗️  Testing Task Hierarchy Validation...');
  
  let createdTaskIds = [];
  
  try {
    // Test 4: Create a master (project) task
    const masterTask = await taskManager.createTask({
      title: 'Test Project',
      description: 'Test project for validation',
      level: 'master',
      status: 'active'
    });
    
    createdTaskIds.push(masterTask.id);
    logTest('Create master task (project)', true);
    
    // Test 5: Create an epic (stage) under the project
    const epicTask = await taskManager.createTask({
      title: 'Test Stage',
      description: 'Test stage for validation', 
      level: 'epic',
      status: 'active',
      parent_id: masterTask.id
    });
    
    createdTaskIds.push(epicTask.id);
    logTest('Create epic task (stage) with valid parent', true);
    
    // Test 6: Create a task under the epic
    const regularTask = await taskManager.createTask({
      title: 'Test Task',
      description: 'Test regular task',
      level: 'task',
      status: 'active', 
      parent_id: epicTask.id
    });
    
    createdTaskIds.push(regularTask.id);
    logTest('Create task with valid parent hierarchy', true);
    
    // Test 7: Try invalid hierarchy (should fail)
    try {
      await taskManager.createTask({
        title: 'Invalid Task',
        description: 'This should fail',
        level: 'epic',
        status: 'active',
        parent_id: masterTask.id // Epic already exists, this should fail hierarchy
      });
      logTest('Invalid hierarchy rejection', false, 'Invalid hierarchy was allowed');
    } catch (error) {
      logTest('Invalid hierarchy rejection', true);
    }
    
  } catch (error) {
    logTest('Task hierarchy creation', false, error);
  }
  
  // Cleanup created tasks
  try {
    for (const taskId of createdTaskIds.reverse()) {
      // Note: Add cleanup method if available in TaskManager
      console.log(`   🧹 Would cleanup task: ${taskId}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}`);
  }
}

async function testMCPServerStartup() {
  console.log('\n🚀 Testing MCP Server Startup...');
  
  try {
    // Test server startup by running a quick MCP test
    const serverProcess = spawn('node', ['server-markdown.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
      env: { ...process.env, MCP_MODE: 'true' }
    });
    
    // Send a basic MCP request
    const testRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    }) + '\n';
    
    let output = '';
    let errorOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Give server time to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    serverProcess.stdin.write(testRequest);
    
    // Wait for response or timeout
    const result = await Promise.race([
      new Promise((resolve) => {
        serverProcess.stdout.on('data', (data) => {
          const response = data.toString();
          if (response.includes('tools') || response.includes('jsonrpc')) {
            resolve({ success: true, output: response });
          }
        });
      }),
      new Promise((resolve) => {
        setTimeout(() => resolve({ success: false, error: 'Timeout waiting for response' }), 8000);
      })
    ]);
    
    serverProcess.kill();
    
    if (result.success) {
      logTest('MCP server startup and response', true);
    } else {
      logTest('MCP server startup and response', false, result.error || 'No response received');
    }
    
    // Check for initialization messages in stderr
    if (errorOutput.includes('HybridTaskManager initialized successfully')) {
      logTest('TaskManager auto-initialization in MCP mode', true);
    } else {
      logTest('TaskManager auto-initialization in MCP mode', false, 
             'TaskManager initialization message not found');
    }
    
  } catch (error) {
    logTest('MCP server startup test', false, error);
  }
}

async function runAllTests() {
  try {
    const taskManager = await testTaskManagerInitialization();
    await testTaskHierarchy(taskManager);
    await testMCPServerStartup();
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    testResults.errors.push({ test: 'Test Suite', error: error.message });
  }
  
  // Print summary
  console.log('\n📋 Test Results Summary');
  console.log('=' + '='.repeat(25));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n💥 Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
  console.log(`\n🎯 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! MCP auto-initialization is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});