#!/usr/bin/env node

/**
 * Simplified startup script for Like-I-Said Dashboard
 * Uses concurrently to manage both servers
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'yellow');
  
  // Check if memories directory exists
  const memoriesDir = path.join(__dirname, 'memories');
  if (!fs.existsSync(memoriesDir)) {
    log('📁 Creating memories directory...', 'yellow');
    fs.mkdirSync(memoriesDir, { recursive: true });
  }
  
  // Check if tasks directory exists
  const tasksDir = path.join(__dirname, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    log('📁 Creating tasks directory...', 'yellow');
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  
  // Check if data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    log('📁 Creating data directory...', 'yellow');
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Check if node_modules exists
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('❌ node_modules not found. Please run "npm install" first.', 'red');
    return false;
  }
  
  // Check if dashboard is built
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    log('🏗️  Building dashboard for first time use...', 'yellow');
    const { execSync } = require('child_process');
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      log('❌ Failed to build dashboard', 'red');
      return false;
    }
  }
  
  log('✅ All prerequisites met', 'green');
  return true;
}

async function start() {
  log('\n🚀 Starting Like-I-Said Dashboard...', 'bright');
  
  // Check prerequisites
  if (!await checkPrerequisites()) {
    process.exit(1);
  }
  
  log('\n📍 Starting services...', 'cyan');
  log('   API Server: http://localhost:3001', 'cyan');
  log('   Dashboard:  http://localhost:5173', 'cyan');
  log('\n💡 Press Ctrl+C to stop all services\n', 'yellow');
  
  // Use concurrently to start both services
  const concurrently = spawn('npm', ['run', 'dashboard'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  concurrently.on('exit', (code) => {
    log('\n\n🛑 Services stopped', 'yellow');
    process.exit(code);
  });
}

// Run the starter
start().catch(error => {
  console.error(`\n${colors.red}💥 Failed to start services: ${error.message}${colors.reset}`);
  process.exit(1);
});