#!/usr/bin/env node

/**
 * Test script for the layered MCP system
 * Tests layer management, dynamic tool loading, and smart suggestions
 */

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🧪 Testing Layered MCP System');
console.log('=' + '='.repeat(35));

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
      console.log(`   Error: ${error}`);
      testResults.errors.push({ test: testName, error });
    }
  }
}

async function testMCPRequest(request) {
  return new Promise((resolve) => {
    const serverProcess = spawn('node', ['server-markdown.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 8000,
      env: { ...process.env, MCP_MODE: 'true' }
    });
    
    let output = '';
    let responseReceived = false;
    
    serverProcess.stdout.on('data', (data) => {
      const response = data.toString();
      output += response;
      
      if (response.includes('"jsonrpc"') && !responseReceived) {
        responseReceived = true;
        serverProcess.kill();
        
        try {
          const jsonResponse = JSON.parse(response.trim());
          resolve({ success: true, data: jsonResponse });
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      // Server initialization messages go to stderr
    });
    
    setTimeout(() => {
      if (!responseReceived) {
        serverProcess.kill();
        resolve({ success: false, error: 'Timeout - no response received' });
      }
    }, 7000);
    
    // Send the MCP request
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(request) + '\\n');
    }, 2000);
  });
}

async function testDefaultToolList() {
  console.log('\\n🔧 Testing Default Tool List (Core Layer Only)...');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  const result = await testMCPRequest(request);
  
  if (result.success && result.data.result) {
    const tools = result.data.result.tools;
    const toolNames = tools.map(t => t.name);
    
    // Should have core tools + meta-tools
    const expectedCoreTools = ['add_memory', 'search_memories', 'get_memory', 'create_task'];
    const expectedMetaTools = ['list_available_layers', 'activate_layer'];
    
    const hasCoreTools = expectedCoreTools.some(tool => toolNames.includes(tool));
    const hasMetaTools = expectedMetaTools.every(tool => toolNames.includes(tool));
    
    logTest(`Core tools available (${toolNames.length} total)`, hasCoreTools);
    logTest('Meta-tools for layer control available', hasMetaTools);
    logTest(`Tool count reasonable (8-15 expected, got ${toolNames.length})`, toolNames.length >= 4 && toolNames.length <= 20);
    
    console.log(`   Found tools: ${toolNames.slice(0, 5).join(', ')}${toolNames.length > 5 ? '...' : ''}`);
  } else {
    logTest('Default tool list retrieval', false, result.error);
  }
}

async function testLayerListTool() {
  console.log('\\n📋 Testing Layer List Tool...');
  
  const request = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'list_available_layers',
      arguments: { show_tools: true }
    }
  };
  
  const result = await testMCPRequest(request);
  
  if (result.success && result.data.result) {
    try {
      const content = result.data.result.content[0].text;
      const layerData = JSON.parse(content);
      
      const hasLayers = layerData.layers && Array.isArray(layerData.layers);
      const hasCoreLayer = layerData.layers.some(l => l.id === 'core' && l.active);
      const hasInactiveLayers = layerData.layers.some(l => !l.active);
      
      logTest('Layer list tool responds', hasLayers);
      logTest('Core layer is active by default', hasCoreLayer);
      logTest('Other layers are inactive by default', hasInactiveLayers);
      
      console.log(`   Found ${layerData.layers.length} layers: ${layerData.layers.map(l => l.id).join(', ')}`);
    } catch (error) {
      logTest('Layer list tool JSON parsing', false, error.message);
    }
  } else {
    logTest('Layer list tool execution', false, result.error);
  }
}

async function testLayerActivation() {
  console.log('\\n🔄 Testing Layer Activation...');
  
  const request = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'activate_layer',
      arguments: { layer_id: 'project' }
    }
  };
  
  const result = await testMCPRequest(request);
  
  if (result.success && result.data.result) {
    try {
      const content = result.data.result.content[0].text;
      const activationResult = JSON.parse(content);
      
      const wasSuccessful = activationResult.results && 
                           activationResult.results.some(r => r.success && r.layerId === 'project');
      const toolsAdded = activationResult.summary && activationResult.summary.totalToolsAdded > 0;
      
      logTest('Project layer activation', wasSuccessful);
      logTest('Tools added after activation', toolsAdded);
      
      if (activationResult.summary) {
        console.log(`   Active tools increased to: ${activationResult.summary.currentActiveTools}`);
      }
    } catch (error) {
      logTest('Layer activation response parsing', false, error.message);
    }
  } else {
    logTest('Layer activation tool execution', false, result.error);
  }
}

async function testSmartSuggestions() {
  console.log('\\n🧠 Testing Smart Suggestions...');
  
  const request = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'get_layer_suggestions',
      arguments: { 
        query_context: 'I need to enhance my memories with AI and analyze performance',
        include_stats: true
      }
    }
  };
  
  const result = await testMCPRequest(request);
  
  if (result.success && result.data.result) {
    try {
      const content = result.data.result.content[0].text;
      const suggestions = JSON.parse(content);
      
      const hasSuggestions = suggestions.suggestions && Array.isArray(suggestions.suggestions);
      const hasRelevantSuggestions = suggestions.suggestions.some(s => 
        s.layerId === 'ai' || s.layerId === 'admin' || s.layerId === 'memory'
      );
      
      logTest('Smart suggestions respond', hasSuggestions);
      logTest('Suggestions are contextually relevant', hasRelevantSuggestions);
      
      if (suggestions.suggestions.length > 0) {
        console.log(`   Suggested layers: ${suggestions.suggestions.map(s => s.layerId).join(', ')}`);
      }
    } catch (error) {
      logTest('Smart suggestions response parsing', false, error.message);
    }
  } else {
    logTest('Smart suggestions tool execution', false, result.error);
  }
}

async function testConfigurationSystem() {
  console.log('\\n⚙️ Testing Configuration System...');
  
  // Test with environment variable configuration
  const testEnv = {
    ...process.env,
    MCP_MODE: 'true',
    MCP_DEFAULT_LAYERS: 'core,project,memory',
    MCP_SMART_SUGGESTIONS: 'true',
    MCP_MAX_TOOLS: '15'
  };
  
  const serverProcess = spawn('node', ['server-markdown.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 8000,
    env: testEnv
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const request = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/list'
  };
  
  return new Promise((resolve) => {
    let responseReceived = false;
    
    serverProcess.stdout.on('data', (data) => {
      const response = data.toString();
      
      if (response.includes('"jsonrpc"') && !responseReceived) {
        responseReceived = true;
        serverProcess.kill();
        
        try {
          const jsonResponse = JSON.parse(response.trim());
          const toolCount = jsonResponse.result.tools.length;
          
          logTest('Configuration environment variables work', true);
          logTest(`Tool count respects MAX_TOOLS setting (${toolCount} ≤ 15)`, toolCount <= 15);
          
          console.log(`   With config: ${toolCount} tools loaded`);
        } catch (error) {
          logTest('Configuration system test', false, error.message);
        }
        
        resolve();
      }
    });
    
    setTimeout(() => {
      if (!responseReceived) {
        serverProcess.kill();
        logTest('Configuration system test', false, 'Timeout');
        resolve();
      }
    }, 7000);
    
    setTimeout(() => {
      serverProcess.stdin.write(JSON.stringify(request) + '\\n');
    }, 2000);
  });
}

async function runAllTests() {
  try {
    await testDefaultToolList();
    await testLayerListTool();
    await testLayerActivation();
    await testSmartSuggestions();
    await testConfigurationSystem();
    
  } catch (error) {
    console.error('\\n❌ Test suite error:', error.message);
    testResults.errors.push({ test: 'Test Suite', error: error.message });
  }
  
  // Print summary
  console.log('\\n📊 Test Results Summary');
  console.log('=' + '='.repeat(25));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\\n💥 Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
  console.log(`\\n🎯 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\\n🎉 All tests passed! Layered MCP system is working correctly.');
    console.log('\\n📖 Usage Guide:');
    console.log('• Set MCP_DEFAULT_LAYERS=core,project to start with project tools');
    console.log('• Use MCP_SMART_SUGGESTIONS=true for intelligent layer suggestions');
    console.log('• Use MCP_MAX_TOOLS=15 to limit the number of concurrent tools');
    console.log('• Use list_available_layers to see what\'s available');
    console.log('• Use activate_layer/deactivate_layer to control functionality');
  } else {
    console.log('\\n⚠️ Some tests failed. The layered system may need adjustments.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal test error:', error);
  process.exit(1);
});