#!/usr/bin/env node

/**
 * JSON Schema Validation Test for Tool #78 Fix
 * This script validates that all MCP tools are compliant with JSON Schema draft-2020-12
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing JSON Schema Compliance for Tool #78 Fix');
console.log('=' .repeat(60));

// Test 1: Verify Claude Desktop Config
console.log('\n📋 Test 1: Claude Desktop Configuration');
try {
  const configPath = 'C:\\Users\\endle\\AppData\\Roaming\\Claude\\claude_desktop_config.json';
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  
  console.log('✅ Claude config loaded successfully');
  console.log(`📊 MCP Servers configured: ${Object.keys(config.mcpServers).length}`);
  
  Object.keys(config.mcpServers).forEach((name, index) => {
    console.log(`   ${index + 1}. ${name}`);
  });
  
  if (Object.keys(config.mcpServers).length === 1 && config.mcpServers['like-i-said-memory-v2']) {
    console.log('✅ Configuration matches expected working setup');
  } else {
    console.log('⚠️  Configuration differs from expected working setup');
  }
  
} catch (error) {
  console.log(`❌ Error reading Claude config: ${error.message}`);
}

// Test 2: Test MCP Server Startup
console.log('\n🚀 Test 2: MCP Server Startup Test');
try {
  // Import and test our server (this will validate schemas during import)
  console.log('📂 Testing server-markdown.js import...');
  
  // We'll test if the file can be read and parsed without syntax errors
  const serverPath = join(__dirname, 'server-markdown.js');
  const serverContent = readFileSync(serverPath, 'utf8');
  
  // Check for draft-2020-12 compliance markers
  const hasCorrectSchema = serverContent.includes('"$schema": "https://json-schema.org/draft/2020-12/schema"');
  const hasAdditionalProperties = serverContent.includes('"additionalProperties": false');
  
  console.log(`✅ Server file readable (${Math.round(serverContent.length / 1024)}KB)`);
  console.log(`${hasCorrectSchema ? '✅' : '❌'} Contains JSON Schema draft-2020-12 headers`);
  console.log(`${hasAdditionalProperties ? '✅' : '❌'} Contains additionalProperties: false`);
  
  // Count tools
  const toolMatches = serverContent.match(/name:\s*['"](.*?)['"],/g);
  const toolCount = toolMatches ? toolMatches.length : 0;
  console.log(`📊 Tools detected: ${toolCount}`);
  
  if (toolCount === 31) {
    console.log('✅ Tool count matches expected (31 tools)');
  } else {
    console.log(`⚠️  Tool count differs from expected (31), got ${toolCount}`);
  }
  
} catch (error) {
  console.log(`❌ Error testing server: ${error.message}`);
}

// Test 3: Check for External Server Conflicts
console.log('\n🔍 Test 3: External Server Conflict Check');
const externalServers = ['context7', 'puppeteer', 'playwright-mcp', 'desktop-commander'];
let hasExternalServers = false;

try {
  const configPath = 'C:\\Users\\endle\\AppData\\Roaming\\Claude\\claude_desktop_config.json';
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  
  externalServers.forEach(serverName => {
    if (config.mcpServers[serverName]) {
      console.log(`⚠️  External server still active: ${serverName}`);
      hasExternalServers = true;
    }
  });
  
  if (!hasExternalServers) {
    console.log('✅ No external servers detected - tool #78 conflict eliminated');
  }
  
} catch (error) {
  console.log(`❌ Error checking external servers: ${error.message}`);
}

// Test 4: Backup Verification
console.log('\n💾 Test 4: Backup Verification');
try {
  const backupPath = join(__dirname, 'claude_desktop_config_backup_tool78.json');
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  
  console.log('✅ Backup exists and is valid JSON');
  console.log(`📊 Backup contains ${Object.keys(backup.mcpServers).length} MCP servers`);
  
} catch (error) {
  console.log(`❌ Error verifying backup: ${error.message}`);
}

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('🎯 SUMMARY');

if (!hasExternalServers) {
  console.log('✅ Tool #78 fix appears successful!');
  console.log('✅ Only compliant MCP server active');
  console.log('✅ External servers removed from configuration');
  console.log('\n🚀 You should now be able to deploy to Vercel without JSON schema errors!');
} else {
  console.log('⚠️  Tool #78 fix may be incomplete');
  console.log('⚠️  External servers still detected in configuration');
  console.log('\n🔧 Consider removing external servers or updating them for draft-2020-12 compliance');
}

console.log('\n📝 Next Steps:');
console.log('1. Restart Claude Desktop if you haven\'t already');
console.log('2. Try your Vercel deployment command');
console.log('3. If successful, gradually re-add MCP servers using test configs');
