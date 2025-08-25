#!/usr/bin/env node

/**
 * Test script for MCP Process Manager
 * Validates automatic process monitoring and cleanup functionality
 */

import { mcpProcessManager } from './lib/mcp-process-manager.js';

async function testProcessManager() {
  console.log('🧪 Testing MCP Process Manager...\n');

  try {
    // Test health check
    console.log('1. Running initial health check...');
    const initialHealth = await mcpProcessManager.runHealthCheck();
    console.log('Initial Health Check Result:', JSON.stringify(initialHealth, null, 2));

    // Test stats
    console.log('\n2. Getting process manager statistics...');
    const stats = mcpProcessManager.getStats();
    console.log('Process Manager Stats:', JSON.stringify(stats, null, 2));

    // Test dry run mode
    console.log('\n3. Testing dry run mode...');
    const originalDryRun = mcpProcessManager.dryRun;
    mcpProcessManager.dryRun = true;
    
    const dryRunHealth = await mcpProcessManager.runHealthCheck();
    console.log('Dry Run Health Check Result:', JSON.stringify(dryRunHealth, null, 2));
    
    mcpProcessManager.dryRun = originalDryRun;

    // Test process detection
    console.log('\n4. Testing process detection...');
    const processes = await mcpProcessManager.getProcesses();
    console.log(`Found ${processes.length} MCP-related processes:`);
    processes.forEach(proc => {
      console.log(`  - PID ${proc.pid}: ${proc.pattern} (CPU: ${proc.cpu}%, MEM: ${proc.mem}%)`);
    });

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testProcessManager();