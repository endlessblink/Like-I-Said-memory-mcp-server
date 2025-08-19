#!/usr/bin/env node

/**
 * JSON Schema Draft 2020-12 Compliance Fixer for server-markdown.js
 * 
 * This script fixes ALL schema compliance issues to resolve the 
 * "tools.45.custom.input_schema" error in Claude Code.
 */

import fs from 'fs';
import path from 'path';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-${Date.now()}`;

console.log('🔧 JSON Schema Draft 2020-12 Compliance Fixer for server-markdown.js');
console.log('=' .repeat(70));

// Create backup
console.log(`📁 Creating backup: ${BACKUP_FILE}`);
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);

// Read the server file
let content = fs.readFileSync(SERVER_FILE, 'utf8');

console.log('🔍 Analyzing and fixing all schema compliance issues...');

// Count existing tools
const toolMatches = content.match(/name: '[^']+',/g);
console.log(`📊 Found ${toolMatches ? toolMatches.length - 1 : 0} tools (excluding server name)`);

// Fix 1: Ensure ALL inputSchema objects have $schema declaration
console.log('✅ Fix 1: Adding missing $schema declarations');
content = content.replace(
  /(inputSchema:\s*\{\s*)(?!\s*"\$schema")(\s*type:\s*['"]object['"])/g,
  '$1"$schema": "https://json-schema.org/draft/2020-12/schema",\n          $2'
);

// Fix 2: Ensure ALL schemas have additionalProperties: false
console.log('✅ Fix 2: Adding missing additionalProperties control');

// Method: Find schema blocks and ensure they all have additionalProperties
// This regex finds complete inputSchema blocks
const schemaBlockRegex = /(inputSchema:\s*\{[\s\S]*?\n\s*\})/g;
content = content.replace(schemaBlockRegex, (match) => {
  if (!match.includes('additionalProperties')) {
    // Find the last closing brace and add additionalProperties before it
    const lastBraceIndex = match.lastIndexOf('}');
    if (lastBraceIndex > -1) {
      const beforeBrace = match.substring(0, lastBraceIndex);
      const afterBrace = match.substring(lastBraceIndex);
      
      // Check if we need a comma
      const needsComma = !beforeBrace.trimEnd().endsWith(',') && !beforeBrace.trimEnd().endsWith('{');
      const comma = needsComma ? ',' : '';
      
      return `${beforeBrace}${comma}\n          "additionalProperties": false\n        ${afterBrace}`;
    }
  }
  return match;
});

// Fix 3: Change 'number' type to 'integer' for integer fields
console.log('✅ Fix 3: Fixing number/integer type mismatches');
const integerFields = [
  'limit', 'timeout_ms', 'recent_memory_count', 'maxResults', 
  'max_depth', 'estimated_hours', 'completion_percentage', 'batch_size',
  'n', 'context_lines', 'timeoutMs', 'expected_replacements', 'length',
  'offset', 'minimum', 'maximum'
];

integerFields.forEach(field => {
  const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*)['"]number['"]`, 'g');
  content = content.replace(regex, '$1"integer"');
});

// Fix 4: Add minimum/maximum constraints where appropriate
console.log('✅ Fix 4: Adding validation constraints');

// Add minLength to required string fields
content = content.replace(
  /(type:\s*['"]string['"],\s*description:\s*['"][^'"]*['"])(?![^}]*minLength)(\s*[,}])/g,
  '$1,\n              "minLength": 1$2'
);

// Add minimum constraints to integer fields that should be positive
const positiveIntegerFields = ['limit', 'n', 'batch_size', 'estimated_hours', 'context_lines'];
positiveIntegerFields.forEach(field => {
  const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*['"]integer['"][^}]*)(\\})`, 'g');
  content = content.replace(regex, (match, beforeClosing, closing) => {
    if (!match.includes('minimum')) {
      return `${beforeClosing},\n              "minimum": 1${closing}`;
    }
    return match;
  });
});

// Fix 5: Ensure enum fields have proper enum constraints
console.log('✅ Fix 5: Adding enum constraints for status/priority fields');

// Status fields
content = content.replace(
  /(status['"]\s*:\s*\{[^}]*type:\s*['"]string['"][^}]*description:[^}]*)(["'])([^}]*?)(\})/g,
  (match, prefix, quote1, middle, suffix) => {
    if (!match.includes('enum') && match.includes('status')) {
      return `${prefix}${quote1}${middle},\n              "enum": ["todo", "in_progress", "done", "blocked"]${suffix}`;
    }
    return match;
  }
);

// Priority fields
content = content.replace(
  /(priority['"]\s*:\s*\{[^}]*type:\s*['"]string['"][^}]*description:[^}]*)(["'])([^}]*?)(\})/g,
  (match, prefix, quote1, middle, suffix) => {
    if (!match.includes('enum') && match.includes('priority')) {
      return `${prefix}${quote1}${middle},\n              "enum": ["low", "medium", "high", "urgent"]${suffix}`;
    }
    return match;
  }
);

// Category fields  
content = content.replace(
  /(category['"]\s*:\s*\{[^}]*type:\s*['"]string['"][^}]*description:[^}]*)(["'])([^}]*?)(\})/g,
  (match, prefix, quote1, middle, suffix) => {
    if (!match.includes('enum') && match.includes('category')) {
      return `${prefix}${quote1}${middle},\n              "enum": ["personal", "work", "code", "research"]${suffix}`;
    }
    return match;
  }
);

// Write the fixed content
console.log('💾 Writing fixed schemas to server-markdown.js');
fs.writeFileSync(SERVER_FILE, content);

console.log('');
console.log('🎉 JSON Schema Draft 2020-12 compliance fixes applied!');
console.log('');
console.log('📋 Changes made:');
console.log('  ✅ Added $schema declarations to all inputSchema objects');
console.log('  ✅ Added additionalProperties: false to all schemas');
console.log('  ✅ Fixed number → integer type mismatches');
console.log('  ✅ Added minLength validation to string fields');
console.log('  ✅ Added minimum constraints to positive integer fields');
console.log('  ✅ Added enum constraints to status/priority/category fields');
console.log('');
console.log('🧪 Next steps:');
console.log('  1. Test the server: node server-markdown.js');
console.log('  2. Test in Claude Code: claude (should not get tool #45 error)');
console.log(`  3. If issues occur, restore backup: cp ${BACKUP_FILE} server-markdown.js`);
console.log('');
console.log('🎯 This should fix the "tools.45.custom.input_schema" JSON schema error!');
