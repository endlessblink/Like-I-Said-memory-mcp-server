#!/usr/bin/env node

/**
 * Build WORKING Dashboard Windows Executable
 * Uses the ACTUAL WORKING launcher with all our fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building WORKING Dashboard Windows Executable...\n');

// Check if pkg is installed
try {
  execSync('pkg --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Error: pkg is not installed globally');
  console.log('📦 Installing pkg...');
  try {
    execSync('npm install -g pkg', { stdio: 'inherit' });
  } catch (installError) {
    console.error('❌ Failed to install pkg. Please run: npm install -g pkg');
    process.exit(1);
  }
}

// Use the ACTUAL WORKING version
const sourceFile = 'dashboard-launcher-fixed-comprehensive.cjs';

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Error: ${sourceFile} not found`);
  console.error('This is the version we need that has all our work!');
  process.exit(1);
}

console.log(`✅ Using CORRECT source: ${sourceFile}`);
console.log('This version includes:');
console.log('  ✅ Configuration menu system');
console.log('  ✅ Memory path handling');
console.log('  ✅ Comprehensive logging');
console.log('  ✅ Memory analysis');
console.log('  ✅ All path fixes');

// Create dist directory
const distDir = path.join(process.cwd(), 'dist-dashboard-working');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`\n📁 Created directory: ${distDir}`);
}

// Clean up any old files
const outputExe = path.join(distDir, 'dashboard-windows.exe');
if (fs.existsSync(outputExe)) {
  fs.unlinkSync(outputExe);
  console.log('🧹 Cleaned up old executable');
}

// Package configuration
const pkgConfig = {
  name: 'dashboard-windows',
  version: '2.4.5',
  description: 'Like-I-Said Dashboard Launcher - Working Version',
  main: sourceFile,
  scripts: {
    start: `node ${sourceFile}`
  },
  pkg: {
    assets: [
      'dashboard-server-bridge.js',
      'lib/**/*.js',
      'lib/**/*.cjs',
      'dist/**/*',
      'manifest.json',
      'package.json'
    ],
    targets: [
      'node18-win-x64'
    ],
    outputPath: distDir
  }
};

// Write temporary package.json for pkg
const tempPackageJson = path.join(distDir, 'package.json');
fs.writeFileSync(tempPackageJson, JSON.stringify(pkgConfig, null, 2));
console.log('\n📝 Created temporary package.json for pkg');

// Copy source file to dist
const distSourceFile = path.join(distDir, sourceFile);
fs.copyFileSync(sourceFile, distSourceFile);
console.log(`📋 Copied ${sourceFile} to dist directory`);

// Build command - using the working version
const buildCommand = `pkg "${distSourceFile}" --targets node18-win-x64 --output "${outputExe}" --compress GZip`;

console.log('\n🚀 Building WORKING executable...');
console.log(`💻 Command: ${buildCommand}\n`);

try {
  execSync(buildCommand, { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
  
  // Check if executable was created
  if (fs.existsSync(outputExe)) {
    const stats = fs.statSync(outputExe);
    console.log(`\n📦 WORKING executable created: ${outputExe}`);
    console.log(`📏 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Create run script
    const runScript = path.join(distDir, 'run-dashboard.bat');
    const runScriptContent = `@echo off
title Like-I-Said Dashboard - WORKING VERSION
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     Like-I-Said Dashboard - WORKING VERSION          ║
echo ║            Version 2.4.5 - All Fixes Applied         ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo This is the version with:
echo - Configuration menu that works
echo - Memory path handling
echo - Comprehensive logging
echo - All our fixes
echo.
echo Starting dashboard...
echo.

"%~dp0dashboard-windows.exe"

if errorlevel 1 (
  echo.
  echo Dashboard crashed! Check the logs directory for details.
  echo.
)

pause
`;
    fs.writeFileSync(runScript, runScriptContent);
    console.log(`\n📄 Created run script: ${runScript}`);
    
    // Create README
    const readmeContent = `# Like-I-Said Dashboard - WORKING VERSION

## Version 2.4.5 - The One That Actually Works!

This executable is built from \`dashboard-launcher-fixed-comprehensive.cjs\` which includes:

✅ **ALL OUR WORK:**
- Configuration menu system
- Memory and task path handling
- Comprehensive logging to \`logs/\` directory
- Memory structure analysis
- Port detection that skips busy ports
- All 8 library files with environment variable fixes

## How to Use

1. **Run directly**: Double-click \`dashboard-windows.exe\`
2. **Run with script**: Double-click \`run-dashboard.bat\`
3. **Check logs**: Look in \`logs/\` directory for diagnostics

## What to Expect

On first run:
1. Creates \`logs/\` directory with detailed diagnostics
2. Shows configuration menu to set memory/task paths
3. Analyzes your memory structure
4. Starts dashboard on available port
5. Loads all your existing memories

## If It Crashes

1. Check the \`logs/\` directory - there should be detailed logs
2. Run \`run-dashboard.bat\` to see any error messages
3. Make sure Node.js is installed on your system

## Key Features

- **Memory Path Configuration**: Set custom paths that persist
- **Comprehensive Logging**: Every step is logged
- **Memory Analysis**: Shows projects and memory counts
- **Port Detection**: Automatically finds available port
- **Error Recovery**: Detailed error messages and logging

This is the version we built together with all the fixes!
`;
    
    const readmePath = path.join(distDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`📖 Created README: ${readmePath}`);
    
    // Clean up temporary files
    fs.unlinkSync(tempPackageJson);
    fs.unlinkSync(distSourceFile);
    console.log('\n🧹 Cleaned up temporary files');
    
    console.log('\n✨ Build complete!');
    console.log('\n🎯 THIS IS THE WORKING VERSION!');
    console.log(`\n📁 Output directory: ${distDir}`);
    console.log('\n🚀 To run the WORKING dashboard:');
    console.log(`   1. Navigate to: ${distDir}`);
    console.log('   2. Double-click: dashboard-windows.exe');
    console.log('   3. Or run: run-dashboard.bat');
    console.log('\n📋 This version WILL create logs and show the configuration menu!\n');
    
  } else {
    console.error('\n❌ Executable was not created');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}