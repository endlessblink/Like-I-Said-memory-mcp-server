#!/usr/bin/env node

// Script to fix all console.log statements in lib/ directory
// Replaces console.log with console.error to prevent breaking JSON-RPC protocol

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const libDir = path.join(__dirname, '..', 'lib');

// Files to process
const filesToFix = [
  'work-detector-wrapper.js',
  'project-task-manager.js',
  'file-system-monitor.js',
  'memory-storage-wrapper.js',
  'system-safeguards.js',
  'analytics-telemetry.js',
  'auth-system.js',
  'settings-manager.js',
  'automation-config.js',
  'automation-scheduler.js',
  'memory-deduplicator.js',
  'title-summary-generator.js',
  'task-automation.js',
  'memory-format.js'
];

let totalFixed = 0;

for (const file of filesToFix) {
  const filePath = path.join(libDir, file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace console.log with console.error
    // Handle various patterns:
    // console.log(
    // console.log (
    // console.log('
    // console.log("
    // console.log(`
    content = content.replace(/console\.log\s*\(/g, 'console.error(');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      const matches = (originalContent.match(/console\.log\s*\(/g) || []).length;
      console.log(`✅ Fixed ${matches} console.log statements in ${file}`);
      totalFixed += matches;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n✅ Total: Fixed ${totalFixed} console.log statements across ${filesToFix.length} files`);
console.log('\nAll console.log statements have been replaced with console.error to prevent breaking JSON-RPC protocol.');