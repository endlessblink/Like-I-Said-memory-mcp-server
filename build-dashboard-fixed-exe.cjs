#!/usr/bin/env node

/**
 * Build Dashboard Windows Executable - Fixed Comprehensive Version
 * Creates dashboard-windows-fixed.exe from the fixed comprehensive launcher
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Dashboard Windows Executable (Fixed Version)...\n');

// Source file - using the fixed comprehensive version
const sourceFile = 'dashboard-launcher-fixed-comprehensive.cjs';

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Error: ${sourceFile} not found`);
  process.exit(1);
}

console.log(`📄 Source: ${sourceFile}`);

// Create dist directory
const distDir = path.join(process.cwd(), 'dist-dashboard-fixed');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`📁 Created directory: ${distDir}`);
}

// Copy source file to dist
const distSourceFile = path.join(distDir, sourceFile);
fs.copyFileSync(sourceFile, distSourceFile);
console.log(`📋 Copied ${sourceFile} to dist directory`);

// Build command
const outputExe = path.join(distDir, 'dashboard-windows-fixed.exe');
const buildCommand = `pkg "${distSourceFile}" --targets node18-win-x64 --output "${outputExe}" --compress GZip`;

console.log('\n🚀 Building executable...');

try {
  execSync(buildCommand, { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
  
  // Check if executable was created
  if (fs.existsSync(outputExe)) {
    const stats = fs.statSync(outputExe);
    console.log(`\n📦 Executable created: ${outputExe}`);
    console.log(`📏 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Create comparison README
    const readmeContent = `# Dashboard Comparison

## Two Versions Available:

### 1. dashboard-windows-fixed.exe (THIS FOLDER)
- ✅ All hardcoded path fixes applied
- ✅ Comprehensive logging
- ✅ Memory loading should work
- ❌ No security fixes

### 2. dashboard-windows.exe (dist-dashboard-executable/)
- ✅ All hardcoded path fixes applied
- ✅ All security vulnerability fixes
- ✅ Comprehensive logging
- ✅ Production ready

## Testing Instructions

1. Test the FIXED version first:
   \`\`\`
   dashboard-windows-fixed.exe
   \`\`\`

2. Then test the SECURE version:
   \`\`\`
   ../dist-dashboard-executable/dashboard-windows.exe
   \`\`\`

Both should work identically for normal usage, but the secure version adds protection against:
- Path injection attacks
- Command injection vulnerabilities
- Configuration tampering
- Race conditions

## Expected Results

Both versions should:
- ✅ Load your existing memories
- ✅ Skip busy ports automatically
- ✅ Save configuration between runs
- ✅ Create logs in the logs/ directory
`;
    
    const readmePath = path.join(distDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`📖 Created README: ${readmePath}`);
    
    // Clean up
    fs.unlinkSync(distSourceFile);
    console.log('\n🧹 Cleaned up temporary files');
    
    console.log('\n✨ Build complete!');
    console.log(`\n📁 Output: ${distDir}/dashboard-windows-fixed.exe`);
    
  } else {
    console.error('\n❌ Executable was not created');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}