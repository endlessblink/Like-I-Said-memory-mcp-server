#!/usr/bin/env node

/**
 * Project Integrity Verification Script
 * Checks that all critical files and functionality are present
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CRITICAL_FILES = {
  // Core MCP Server Files
  'MCP Server': [
    'server-markdown.js',
    'server.js',
    'cli.js',
    'cli.cmd'
  ],
  
  // Worker Thread Backup System
  'Backup System': [
    'backup-worker.js',
    'backup-system.js',
    'backup-runner.js'
  ],
  
  // Dashboard Files
  'Dashboard': [
    'dashboard-server.js',
    'dashboard-server-bridge.js',
    'simple-dashboard.html',
    'index.html'
  ],
  
  // React Components
  'React Components': [
    'src/App.tsx',
    'src/components/MemoryCard.tsx',
    'src/components/AdvancedSearch.tsx',
    'src/components/ProjectTabs.tsx',
    'src/components/AddMemoryDialog.tsx',
    'src/components/EditMemoryDialog.tsx',
    'src/components/MemoriesTable.tsx'
  ],
  
  // UI Components
  'UI Components': [
    'src/components/ui/button.tsx',
    'src/components/ui/dialog.tsx',
    'src/components/ui/input.tsx',
    'src/components/ui/label.tsx',
    'src/components/ui/select.tsx',
    'src/components/ui/table.tsx',
    'src/components/ui/textarea.tsx',
    'src/components/ui/badge.tsx'
  ],
  
  // Configuration Files
  'Configuration': [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js'
  ],
  
  // Documentation
  'Documentation': [
    'README.md',
    'INSTALLATION-GUIDE.md',
    'LICENSE',
    'CLAUDE.md'
  ],
  
  // Docker Testing
  'Docker Testing': [
    'Dockerfile.test',
    'Dockerfile.interactive',
    'test-with-docker.cmd',
    'test-interactive-docker.cmd',
    'test-new-user.cmd'
  ],
  
  // Assets
  'Assets': [
    'assets/cover.png',
    'assets/dashboard_1.png',
    'assets/dashboard_2.png',
    'assets/dashboard_3.png',
    'assets/dashboard_4.png'
  ]
};

const REQUIRED_DEPENDENCIES = [
  '@modelcontextprotocol/sdk',
  'express',
  'cors',
  'chokidar',
  'react',
  'react-dom',
  '@radix-ui/react-dialog',
  'tailwindcss',
  'vite'
];

console.log('🔍 Like-I-Said v2.3.0 Project Integrity Check\n');

let totalFiles = 0;
let missingFiles = [];
let foundFiles = 0;

// Check Critical Files
console.log('📁 Checking Critical Files:\n');
for (const [category, files] of Object.entries(CRITICAL_FILES)) {
  console.log(`\n${category}:`);
  for (const file of files) {
    totalFiles++;
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
      foundFiles++;
    } else {
      console.log(`  ❌ ${file} - MISSING!`);
      missingFiles.push(file);
    }
  }
}

// Check Memory Files
console.log('\n\n📊 Memory Files Check:');
const memoriesDir = path.join(__dirname, 'memories');
if (fs.existsSync(memoriesDir)) {
  const countMemories = (dir) => {
    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        count += countMemories(fullPath);
      } else if (file.endsWith('.md')) {
        count++;
      }
    }
    return count;
  };
  
  const memoryCount = countMemories(memoriesDir);
  console.log(`  ✅ Found ${memoryCount} memory files in memories/ directory`);
} else {
  console.log('  ❌ memories/ directory is MISSING!');
  missingFiles.push('memories/');
}

// Check Package Dependencies
console.log('\n📦 Checking Key Dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  for (const dep of REQUIRED_DEPENDENCIES) {
    if (deps[dep]) {
      console.log(`  ✅ ${dep}: ${deps[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING from package.json!`);
      missingFiles.push(`dependency: ${dep}`);
    }
  }
} catch (error) {
  console.log('  ❌ Could not read package.json!');
}

// Test MCP Server
console.log('\n🧪 Testing MCP Server Functionality:');
try {
  const serverPath = path.join(__dirname, 'server-markdown.js');
  if (fs.existsSync(serverPath)) {
    console.log('  ✅ server-markdown.js exists');
    // Check if it exports the required tools
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    const tools = ['add_memory', 'get_memory', 'list_memories', 'delete_memory', 'search_memories', 'test_tool'];
    let toolsFound = 0;
    for (const tool of tools) {
      if (serverContent.includes(`name: '${tool}'`)) {
        toolsFound++;
      }
    }
    console.log(`  ✅ Found ${toolsFound}/6 MCP tools defined`);
  }
} catch (error) {
  console.log('  ❌ Error checking MCP server:', error.message);
}

// Summary
console.log('\n\n📊 INTEGRITY CHECK SUMMARY:');
console.log('════════════════════════════');
console.log(`Total files checked: ${totalFiles}`);
console.log(`Files found: ${foundFiles}`);
console.log(`Files missing: ${missingFiles.length}`);

if (missingFiles.length > 0) {
  console.log('\n❌ MISSING FILES:');
  missingFiles.forEach(file => console.log(`  - ${file}`));
  console.log('\n⚠️  PROJECT INTEGRITY COMPROMISED!');
} else {
  console.log('\n✅ ALL CRITICAL FILES PRESENT!');
  console.log('🎉 Project integrity verified!');
}

// Version Check
console.log('\n📌 Version Information:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log(`  Package: ${packageJson.name}`);
  console.log(`  Version: ${packageJson.version}`);
  console.log(`  Description: ${packageJson.description}`);
} catch (error) {
  console.log('  ❌ Could not read version information');
}

console.log('\n✨ Verification complete!');