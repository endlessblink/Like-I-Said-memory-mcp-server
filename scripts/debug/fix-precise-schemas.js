#!/usr/bin/env node

/**
 * PRECISE JSON Schema Draft 2020-12 Compliance Fixer
 * 
 * This version uses a more surgical approach to avoid syntax errors.
 */

import fs from 'fs';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-${Date.now()}`;

console.log('🔧 PRECISE JSON Schema Draft 2020-12 Compliance Fixer');
console.log('=' .repeat(60));

// Create backup
console.log(`📁 Creating backup: ${BACKUP_FILE}`);
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);

let content = fs.readFileSync(SERVER_FILE, 'utf8');

console.log('🔍 Applying precise fixes...');

// Fix 1: Add $schema to schemas that don't have it
console.log('✅ Fix 1: Adding $schema declarations');
content = content.replace(
  /(inputSchema:\s*\{\s*)(type:\s*['"]object['"])/g,
  '$1"$schema": "https://json-schema.org/draft/2020-12/schema",\n          $2'
);

// Fix 2: Add additionalProperties to the end of required arrays
console.log('✅ Fix 2: Adding additionalProperties after required arrays');
content = content.replace(
  /(required:\s*\[[^\]]*\])(\s*\})/g,
  '$1,\n          "additionalProperties": false$2'
);

// Fix 3: Add additionalProperties to schemas without required (before closing brace)
console.log('✅ Fix 3: Adding additionalProperties to schemas without required');
content = content.replace(
  /(properties:\s*\{[^}]*\}\s*)(\}\s*\})/g,
  (match, properties, ending) => {
    if (!match.includes('required') && !match.includes('additionalProperties')) {
      return `${properties},\n          "additionalProperties": false\n        ${ending}`;
    }
    return match;
  }
);

// Fix 4: Convert number to integer for specific fields
console.log('✅ Fix 4: Converting number to integer types');
const integerFields = ['limit', 'timeout_ms', 'n', 'batch_size', 'context_lines'];
integerFields.forEach(field => {
  const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*)['"]number['"]`, 'g');
  content = content.replace(regex, '$1"integer"');
});

// Fix 5: Add minLength to required string fields (conservative approach)
console.log('✅ Fix 5: Adding minLength to required strings');
const stringFieldsNeedingMinLength = ['content', 'query', 'text', 'title', 'natural_language_input'];
stringFieldsNeedingMinLength.forEach(field => {
  const regex = new RegExp(`(${field}:\\s*\\{\\s*type:\\s*['"]string['"],\\s*description:[^}]*)(\\})`, 'g');
  content = content.replace(regex, (match, prefix, suffix) => {
    if (!match.includes('minLength')) {
      return `${prefix},\n              "minLength": 1\n            ${suffix}`;
    }
    return match;
  });
});

// Write the fixed content
fs.writeFileSync(SERVER_FILE, content);

console.log('');
console.log('🎉 Precise fixes applied successfully!');
console.log('');
console.log('🧪 Test commands:');
console.log('  1. node server-markdown.js');
console.log('  2. claude (in Claude Code)');
console.log('');
console.log(`🔄 Restore command if needed: cp ${BACKUP_FILE} server-markdown.js`);
