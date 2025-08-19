#!/usr/bin/env node

/**
 * Script to identify and fix tool #78 JSON Schema compliance issue
 * This script will:
 * 1. Create test configurations with different server combinations
 * 2. Test each configuration to identify which server has the problematic tool #78
 * 3. Provide a fix strategy
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to Claude config
const claudeConfigPath = 'C:\\Users\\endle\\AppData\\Roaming\\Claude\\claude_desktop_config.json';

// Read current config
console.log('🔍 Reading current Claude configuration...');
const currentConfig = JSON.parse(readFileSync(claudeConfigPath, 'utf8'));

console.log('\n📊 Current MCP Servers:');
Object.keys(currentConfig.mcpServers).forEach((name, index) => {
  console.log(`  ${index + 1}. ${name}`);
});

// Create minimal config with only like-i-said server (known working)
const workingConfig = {
  "mcpServers": {
    "like-i-said-memory-v2": currentConfig.mcpServers["like-i-said-memory-v2"]
  }
};

// Create test configs to isolate the problematic server
const testConfigs = [
  {
    name: "test-1-like-i-said-only",
    config: {
      "mcpServers": {
        "like-i-said-memory-v2": currentConfig.mcpServers["like-i-said-memory-v2"]
      }
    }
  },
  {
    name: "test-2-with-ai-liftoff",
    config: {
      "mcpServers": {
        "like-i-said-memory-v2": currentConfig.mcpServers["like-i-said-memory-v2"],
        "ai-liftoff-site": currentConfig.mcpServers["ai-liftoff-site"]
      }
    }
  },
  {
    name: "test-3-with-rough-cut",
    config: {
      "mcpServers": {
        "like-i-said-memory-v2": currentConfig.mcpServers["like-i-said-memory-v2"],
        "rough-cut-mcp": currentConfig.mcpServers["rough-cut-mcp"]
      }
    }
  },
  {
    name: "test-4-with-desktop-commander",
    config: {
      "mcpServers": {
        "like-i-said-memory-v2": currentConfig.mcpServers["like-i-said-memory-v2"],
        "desktop-commander": currentConfig.mcpServers["desktop-commander"]
      }
    }
  },
  {
    name: "test-5-external-servers-only",
    config: {
      "mcpServers": {
        "context7": currentConfig.mcpServers["context7"],
        "puppeteer": currentConfig.mcpServers["puppeteer"],
        "playwright-mcp": currentConfig.mcpServers["playwright-mcp"]
      }
    }
  }
];

console.log('\n🔧 Creating test configurations...');

// Save backup of current config
const backupPath = join(__dirname, 'claude_desktop_config_backup_tool78.json');
writeFileSync(backupPath, JSON.stringify(currentConfig, null, 2));
console.log(`✅ Backup saved: ${backupPath}`);

// Create test config files
testConfigs.forEach(test => {
  const testPath = join(__dirname, `${test.name}.json`);
  writeFileSync(testPath, JSON.stringify(test.config, null, 2));
  console.log(`📝 Created: ${test.name}.json`);
});

// Save working config
const workingPath = join(__dirname, 'claude_desktop_config_working_tool78.json');
writeFileSync(workingPath, JSON.stringify(workingConfig, null, 2));
console.log(`✅ Working config saved: ${workingPath}`);

console.log('\n🎯 IMMEDIATE SOLUTION - Switch to working config:');
console.log('1. Copy the working config to Claude:');
console.log(`   copy "${workingPath}" "${claudeConfigPath}"`);
console.log('2. Restart Claude Desktop');
console.log('3. Test if tool #78 error is gone');

console.log('\n🔬 SYSTEMATIC TESTING PROCESS:');
console.log('To identify which server has tool #78:');
testConfigs.forEach((test, index) => {
  console.log(`\n${index + 1}. Test ${test.name}:`);
  console.log(`   copy "${join(__dirname, test.name)}.json" "${claudeConfigPath}"`);
  console.log(`   Restart Claude Desktop and test`);
  console.log(`   Servers: ${Object.keys(test.config.mcpServers).join(', ')}`);
});

console.log('\n⚠️  MOST LIKELY CULPRITS:');
console.log('Tool #78 is most likely from:');
console.log('- context7 (external MCP)');
console.log('- puppeteer (external MCP via Smithery)');
console.log('- playwright-mcp (external MCP via Smithery)');
console.log('- desktop-commander (external MCP)');

console.log('\n🔧 LONG-TERM SOLUTION:');
console.log('1. Update external MCPs to latest versions');
console.log('2. Replace problematic external MCPs with compliant alternatives');
console.log('3. Use only your own MCP servers (all fixed for draft-2020-12)');

console.log('\n✅ COMPLETED: Run the copy command above to fix immediately!');
