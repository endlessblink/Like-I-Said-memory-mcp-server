#!/usr/bin/env node

/**
 * Build Dashboard Windows Executable
 * Creates dashboard-windows.exe from the secure final launcher
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Dashboard Windows Executable...\n');

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

// Source file - using the secure final version with all fixes
const sourceFile = 'dashboard-launcher-secure-final.cjs';

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Error: ${sourceFile} not found`);
  console.log('🔄 Using fixed comprehensive version instead...');
  sourceFile = 'dashboard-launcher-fixed-comprehensive.cjs';
  
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ No suitable launcher file found');
    process.exit(1);
  }
}

console.log(`📄 Source: ${sourceFile}`);

// Create dist directory
const distDir = path.join(process.cwd(), 'dist-dashboard-executable');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`📁 Created directory: ${distDir}`);
}

// Package configuration
const pkgConfig = {
  name: 'dashboard-windows',
  version: '2.4.6',
  description: 'Like-I-Said Dashboard Launcher',
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
console.log('📝 Created temporary package.json for pkg');

// Copy source file to dist
const distSourceFile = path.join(distDir, sourceFile);
fs.copyFileSync(sourceFile, distSourceFile);
console.log(`📋 Copied ${sourceFile} to dist directory`);

// Build command
const outputExe = path.join(distDir, 'dashboard-windows.exe');
const buildCommand = `pkg "${distSourceFile}" --targets node18-win-x64 --output "${outputExe}" --compress GZip`;

console.log('\n🚀 Building executable...');
console.log(`💻 Command: ${buildCommand}\n`);

try {
  execSync(buildCommand, { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
  
  // Check if executable was created
  if (fs.existsSync(outputExe)) {
    const stats = fs.statSync(outputExe);
    console.log(`\n📦 Executable created: ${outputExe}`);
    console.log(`📏 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Create run script
    const runScript = path.join(distDir, 'run-dashboard.bat');
    const runScriptContent = `@echo off
title Like-I-Said Dashboard
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║          Like-I-Said Dashboard Launcher              ║
echo ║                 Version 2.4.6                        ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Starting dashboard...
echo.

"%~dp0dashboard-windows.exe"

pause
`;
    fs.writeFileSync(runScript, runScriptContent);
    console.log(`\n📄 Created run script: ${runScript}`);
    
    // Create README
    const readmeContent = `# Like-I-Said Dashboard Windows Executable

## Version 2.4.6 - Secure Edition

This executable includes:
- ✅ All hardcoded path fixes
- ✅ All security vulnerability fixes
- ✅ Authentication disabled by default
- ✅ Comprehensive logging
- ✅ Memory loading should work correctly

## How to Use

1. **Run directly**: Double-click \`dashboard-windows.exe\`
2. **Run with script**: Double-click \`run-dashboard.bat\`
3. **Run from command line**: \`dashboard-windows.exe\`

## Features

- Auto-detects available ports (skips busy ports like Flowise)
- Allows custom memory and task directory configuration
- Saves configuration between sessions
- Creates detailed logs in \`logs/\` directory

## First Run

On first run, you'll be prompted to:
1. Set your memory directory path
2. Set your task directory path
3. Choose whether to auto-open browser

## Troubleshooting

If memories don't load:
1. Check the \`logs/\` directory for detailed diagnostics
2. Ensure authentication is disabled (it is by default)
3. Verify your memory path is correct in the configuration

## Security

This version includes protection against:
- Path injection attacks
- Command injection vulnerabilities
- Configuration tampering
- Race conditions in port detection

## File Structure

\`\`\`
dist-dashboard-executable/
├── dashboard-windows.exe    # Main executable
├── run-dashboard.bat       # Batch file to run dashboard
├── README.md              # This file
└── package.json          # Build configuration
\`\`\`
`;
    
    const readmePath = path.join(distDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`📖 Created README: ${readmePath}`);
    
    // Clean up temporary files
    fs.unlinkSync(tempPackageJson);
    fs.unlinkSync(distSourceFile);
    console.log('\n🧹 Cleaned up temporary files');
    
    console.log('\n✨ Build complete!');
    console.log(`\n📁 Output directory: ${distDir}`);
    console.log('\n🚀 To run the dashboard:');
    console.log(`   1. Navigate to: ${distDir}`);
    console.log('   2. Double-click: dashboard-windows.exe');
    console.log('   3. Or run: run-dashboard.bat\n');
    
  } else {
    console.error('\n❌ Executable was not created');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}