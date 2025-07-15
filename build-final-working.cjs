#!/usr/bin/env node

/**
 * Build FINAL WORKING Dashboard Windows Executable
 * Combines proven working launcher with all path fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building FINAL WORKING Dashboard Executable...\n');

// Use the final working launcher that combines all fixes
const sourceFile = 'dashboard-launcher-final-working.cjs';

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Error: ${sourceFile} not found`);
  process.exit(1);
}

console.log(`✅ Using FINAL WORKING source: ${sourceFile}`);
console.log('This version includes:');
console.log('  ✅ Working configuration menu from proven launcher');
console.log('  ✅ Path memory fixes (MEMORY_DIR/TASK_DIR environment variables)');
console.log('  ✅ All 8 library files with environment variable support');
console.log('  ✅ Proper pkg executable handling (BASE_DIR)');
console.log('  ✅ Memory structure analysis');
console.log('  ✅ Detailed logging for debugging');

// Create dist directory
const distDir = path.join(process.cwd(), 'dist-final-working');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Clean up old executable
const outputExe = path.join(distDir, 'dashboard.exe');
if (fs.existsSync(outputExe)) {
  fs.unlinkSync(outputExe);
  console.log('\n🧹 Cleaned up old executable');
}

// Copy source to dist
const distSourceFile = path.join(distDir, sourceFile);
fs.copyFileSync(sourceFile, distSourceFile);
console.log('\n📋 Copied final working launcher');

// Also copy dashboard-server-bridge.js to dist directory
const serverSource = 'dashboard-server-bridge.js';
const distServerFile = path.join(distDir, serverSource);
if (fs.existsSync(serverSource)) {
  fs.copyFileSync(serverSource, distServerFile);
  console.log('📋 Copied dashboard server bridge');
}

// Build command
const buildCommand = `pkg "${distSourceFile}" --targets node18-win-x64 --output "${outputExe}" --assets dashboard-server-bridge.js`;

console.log('\n🚀 Building with final working configuration...\n');

try {
  execSync(buildCommand, { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
  
  if (fs.existsSync(outputExe)) {
    const stats = fs.statSync(outputExe);
    console.log(`\n📦 Executable created: ${outputExe}`);
    console.log(`📏 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Clean up source copy
    fs.unlinkSync(distSourceFile);
    
    console.log('\n✨ SUCCESS!');
    console.log('\n🎯 This is the FINAL WORKING version that:');
    console.log('  ✅ Remembers custom paths between sessions');
    console.log('  ✅ Loads memories from configured directories');
    console.log('  ✅ Creates logs for debugging');
    console.log('  ✅ Works as a single executable');
    console.log(`\n📁 Location: ${distDir}`);
    console.log('🚀 Just run: dashboard.exe');
    console.log('\nFirst run will show configuration menu to set paths.');
    console.log('Subsequent runs will remember your settings.');
    
  } else {
    console.error('\n❌ Executable was not created');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}