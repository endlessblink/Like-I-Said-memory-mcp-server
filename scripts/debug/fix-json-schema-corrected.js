#!/usr/bin/env node

/**
 * CORRECTED JSON Schema Draft 2020-12 Compliance Fixer
 * 
 * This version fixes the syntax error in the previous version
 * and ensures proper JavaScript syntax while applying JSON Schema fixes.
 */

import fs from 'fs';
import path from 'path';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-corrected-${Date.now()}`;

console.log('🔧 CORRECTED JSON Schema Draft 2020-12 Compliance Fixer');
console.log('=' .repeat(60));

// Backup original file
console.log(`📁 Creating backup: ${BACKUP_FILE}`);
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);

// Read the server file
let content = fs.readFileSync(SERVER_FILE, 'utf8');

console.log('🔍 Analyzing schemas and fixing syntax issues...');

// Strategy: Use more precise regex patterns to avoid syntax errors

// Fix 1: Add $schema declaration to inputSchema objects
console.log('✅ Fix 1: Adding $schema declarations');
content = content.replace(
  /(inputSchema:\s*\{\s*)(type:\s*'object',)/g,
  '$1"$schema": "https://json-schema.org/draft/2020-12/schema",\n          $2'
);

// Fix 2: Add additionalProperties to schemas (more careful approach)
console.log('✅ Fix 2: Adding additionalProperties control');

// Find schema blocks and add additionalProperties before the last closing brace
content = content.replace(
  /(inputSchema:\s*\{[^}]*properties:\s*\{[^}]*\}[^}]*)(required:\s*\[[^\]]*\])([^}]*\})/g,
  (match, beforeRequired, requiredPart, afterRequired) => {
    if (!match.includes('additionalProperties')) {
      return `${beforeRequired}${requiredPart},\n          "additionalProperties": false${afterRequired}`;
    }
    return match;
  }
);

// For schemas without required fields
content = content.replace(
  /(inputSchema:\s*\{[^}]*properties:\s*\{[^}]*\})([^}]*)(},?\s*\})/g,
  (match, beforeProps, middle, closing) => {
    if (!match.includes('additionalProperties') && !match.includes('required')) {
      return `${beforeProps}${middle},\n          "additionalProperties": false${closing}`;
    }
    return match;
  }
);

// Fix 3: Convert number to integer for specific fields
console.log('✅ Fix 3: Converting number to integer for appropriate fields');
const integerFields = [
  'limit', 'timeout_ms', 'recent_memory_count', 'maxResults', 
  'max_depth', 'estimated_hours', 'completion_percentage', 'batch_size'
];

integerFields.forEach(field => {
  const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*)'number'`, 'g');
  content = content.replace(regex, '$1\'integer\'');
});

// Fix 4: Add minLength to string fields (more careful)
console.log('✅ Fix 4: Adding minLength validation to string fields');
const stringFields = ['content', 'query', 'message', 'text', 'title', 'description'];

stringFields.forEach(field => {
  // Look for string type definitions and add minLength if not present
  const regex = new RegExp(
    `(${field}:\\s*\\{[^}]*type:\\s*'string'[^}]*description:[^}]*)(\\})`,
    'g'
  );
  content = content.replace(regex, (match, prefix, suffix) => {
    if (!match.includes('minLength')) {
      return `${prefix},\n              "minLength": 1${suffix}`;
    }
    return match;
  });
});

// Fix 5: Add minimum constraints to integer fields
console.log('✅ Fix 5: Adding minimum constraints to integer fields');
const positiveFields = ['limit', 'recent_memory_count', 'maxResults', 'batch_size'];

positiveFields.forEach(field => {
  const regex = new RegExp(
    `(${field}:\\s*\\{[^}]*type:\\s*'integer'[^}]*)(\\})`,
    'g'
  );
  content = content.replace(regex, (match, prefix, suffix) => {
    if (!match.includes('minimum')) {
      return `${prefix},\n              "minimum": 1${suffix}`;
    }
    return match;
  });
});

// Validation: Check for common syntax errors
console.log('🔍 Validating syntax...');

const syntaxIssues = [];

// Check for double commas
if (content.includes(',,')) {
  syntaxIssues.push('Double commas found');
}

// Check for trailing commas before closing braces in problematic patterns
const problematicCommas = content.match(/,\s*,/g);
if (problematicCommas) {
  syntaxIssues.push(`${problematicCommas.length} double comma patterns found`);
}

// Fix double commas
content = content.replace(/,\s*,/g, ',');

// Fix trailing commas followed by property additions
content = content.replace(/},(\s*"[^"]+":)/g, '},\n$1');

if (syntaxIssues.length > 0) {
  console.log('⚠️  Fixed syntax issues:', syntaxIssues);
}

// Write the corrected content
fs.writeFileSync(SERVER_FILE, content);

console.log('');
console.log('🎉 CORRECTED JSON Schema fixes applied!');
console.log('');
console.log('📊 Summary:');
console.log(`   • Backup created: ${BACKUP_FILE}`);
console.log(`   • Fixed file: ${SERVER_FILE}`);
console.log('');
console.log('🔬 Changes Applied:');
console.log('   ✅ Added $schema declarations');
console.log('   ✅ Added additionalProperties: false (syntax-safe)');
console.log('   ✅ Fixed number → integer types');
console.log('   ✅ Added minLength validation (syntax-safe)');
console.log('   ✅ Added minimum constraints');
console.log('   ✅ Fixed syntax issues');
console.log('');
console.log('🧪 Testing server startup...');

// Test the server syntax
import { spawn } from 'child_process';

const testProcess = spawn('node', ['--check', SERVER_FILE]);

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Syntax validation passed!');
    console.log('');
    console.log('🚀 Ready to test in Claude Code!');
  } else {
    console.log('❌ Syntax validation failed!');
    console.log('🔄 Restoring backup...');
    fs.copyFileSync(BACKUP_FILE, SERVER_FILE);
    console.log('✅ Backup restored. Please check for syntax issues manually.');
  }
});

testProcess.stderr.on('data', (data) => {
  console.log('❌ Syntax error:', data.toString());
});
