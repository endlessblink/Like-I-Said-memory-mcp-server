#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Like-I-Said v2 Backup Restoration Tool\n');

// Parse command line arguments
const args = process.argv.slice(2);
const backupFile = args[0];
const targetDir = args[1] || 'restored-v2';

if (!backupFile) {
  console.error('❌ Error: Please provide a backup file path');
  console.log('\nUsage: node restore-backup.js <backup-file> [target-directory]');
  console.log('Example: node restore-backup.js data-backups/like-i-said-v2-backup-20250801-000350.tar.gz restored-v2');
  process.exit(1);
}

// Check if backup file exists
if (!fs.existsSync(backupFile)) {
  console.error(`❌ Error: Backup file not found: ${backupFile}`);
  process.exit(1);
}

// Check if target directory already exists
if (fs.existsSync(targetDir)) {
  console.error(`❌ Error: Target directory already exists: ${targetDir}`);
  console.log('Please remove it or choose a different directory.');
  process.exit(1);
}

console.log(`📦 Backup file: ${backupFile}`);
console.log(`📁 Target directory: ${targetDir}`);
console.log('');

try {
  // Create target directory
  console.log('1️⃣ Creating target directory...');
  fs.mkdirSync(targetDir, { recursive: true });

  // Extract backup
  console.log('2️⃣ Extracting backup files...');
  execSync(`tar -xzf "${backupFile}" -C "${targetDir}"`, { stdio: 'inherit' });

  // Verify critical files
  console.log('\n3️⃣ Verifying critical files...');
  const criticalFiles = [
    'package.json',
    'server-markdown.js',
    'cli.js',
    'dashboard-server-bridge.js',
    'server.js',
    'README.md',
    'CLAUDE.md'
  ];

  const criticalDirs = [
    'lib',
    'src',
    'docs',
    'scripts'
  ];

  let allFilesPresent = true;
  
  console.log('\n📄 Checking files:');
  for (const file of criticalFiles) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING`);
      allFilesPresent = false;
    }
  }

  console.log('\n📁 Checking directories:');
  for (const dir of criticalDirs) {
    const dirPath = path.join(targetDir, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const fileCount = fs.readdirSync(dirPath).length;
      console.log(`  ✅ ${dir}/ (${fileCount} items)`);
    } else {
      console.log(`  ❌ ${dir}/ - MISSING`);
      allFilesPresent = false;
    }
  }

  // Check package.json validity
  console.log('\n4️⃣ Validating package.json...');
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`  ✅ Valid package.json`);
      console.log(`  📦 Name: ${packageJson.name}`);
      console.log(`  🏷️  Version: ${packageJson.version}`);
    } catch (e) {
      console.log(`  ❌ Invalid package.json: ${e.message}`);
      allFilesPresent = false;
    }
  }

  // Final report
  console.log('\n' + '='.repeat(50));
  if (allFilesPresent) {
    console.log('✅ Restoration completed successfully!');
    console.log('\nNext steps:');
    console.log(`1. cd ${targetDir}`);
    console.log('2. npm install');
    console.log('3. npm run dev:full');
  } else {
    console.log('⚠️  Restoration completed with warnings');
    console.log('Some files or directories are missing.');
    console.log('The backup may be incomplete or corrupted.');
  }

  // Create restoration report
  const reportPath = path.join(targetDir, 'RESTORATION_REPORT.txt');
  const report = `Like-I-Said v2 Restoration Report
================================
Date: ${new Date().toISOString()}
Backup File: ${backupFile}
Target Directory: ${targetDir}
Status: ${allFilesPresent ? 'SUCCESS' : 'PARTIAL'}

Files Checked:
${criticalFiles.map(f => `- ${f}: ${fs.existsSync(path.join(targetDir, f)) ? 'OK' : 'MISSING'}`).join('\n')}

Directories Checked:
${criticalDirs.map(d => {
  const dirPath = path.join(targetDir, d);
  if (fs.existsSync(dirPath)) {
    return `- ${d}/: OK (${fs.readdirSync(dirPath).length} items)`;
  }
  return `- ${d}/: MISSING`;
}).join('\n')}

Next Steps:
1. cd ${targetDir}
2. npm install
3. npm run dev:full
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Restoration report saved to: ${reportPath}`);

} catch (error) {
  console.error('\n❌ Restoration failed:', error.message);
  
  // Clean up on failure
  if (fs.existsSync(targetDir)) {
    console.log('\n🧹 Cleaning up failed restoration...');
    try {
      execSync(`rm -rf "${targetDir}"`, { stdio: 'inherit' });
    } catch (e) {
      console.log('Failed to clean up. Please manually remove:', targetDir);
    }
  }
  
  process.exit(1);
}