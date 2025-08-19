#!/usr/bin/env node

/**
 * FINAL FIX: Add additionalProperties to ALL remaining required schemas
 */

import fs from 'fs';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-final-${Date.now()}`;

console.log('🔧 FINAL additionalProperties Fix for ALL remaining schemas');
console.log('=' .repeat(60));

// Backup
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
console.log(`📁 Backup: ${BACKUP_FILE}`);

let content = fs.readFileSync(SERVER_FILE, 'utf8');

const beforeRequired = (content.match(/required:\s*\[/g) || []).length;
const beforeAdditionalProps = (content.match(/additionalProperties/g) || []).length;

console.log(`📊 Before: ${beforeRequired} required, ${beforeAdditionalProps} additionalProperties`);
console.log(`🎯 Need to fix: ${beforeRequired - beforeAdditionalProps} missing additionalProperties`);

// Fix the specific pattern: required: [...], followed by }, without additionalProperties
// This pattern matches required arrays followed immediately by closing brace
content = content.replace(
  /(required:\s*\[[^\]]*\],)(\s*\},)/g,
  '$1\n          "additionalProperties": false$2'
);

// Write fixed content
fs.writeFileSync(SERVER_FILE, content);

// Verify
const finalContent = fs.readFileSync(SERVER_FILE, 'utf8');
const afterRequired = (finalContent.match(/required:\s*\[/g) || []).length;
const afterAdditionalProps = (finalContent.match(/additionalProperties/g) || []).length;

console.log(`📊 After: ${afterRequired} required, ${afterAdditionalProps} additionalProperties`);

if (afterRequired === afterAdditionalProps) {
  console.log('🎉 SUCCESS: ALL schemas now have proper additionalProperties!');
  console.log('✅ Tool #45 JSON Schema error should be resolved!');
} else {
  console.log('⚠️ Some schemas may still need manual fixing');
}

console.log('');
console.log('🧪 Test commands:');
console.log('  1. node server-markdown.js');
console.log('  2. claude (should work without tool #45 error)');
console.log(`🔄 Restore: cp ${BACKUP_FILE} server-markdown.js`);
