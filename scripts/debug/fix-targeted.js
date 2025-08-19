#!/usr/bin/env node

/**
 * TARGETED FIX for remaining additionalProperties
 * Adds additionalProperties to the exact schemas that are missing it
 */

import fs from 'fs';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-targeted-${Date.now()}`;

console.log('🎯 TARGETED additionalProperties Fix');
console.log('=' .repeat(45));

// Backup
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
console.log(`📁 Backup: ${BACKUP_FILE}`);

let content = fs.readFileSync(SERVER_FILE, 'utf8');

// Count before
const beforeRequired = (content.match(/required:\s*\[/g) || []).length;
const beforeAdditionalProps = (content.match(/additionalProperties/g) || []).length;

console.log(`📊 Before: ${beforeRequired} required, ${beforeAdditionalProps} additionalProperties`);

// TARGETED FIX: Add additionalProperties exactly where it's missing
// Pattern: required: [...], followed by }, without additionalProperties in between
console.log('🎯 Adding additionalProperties to exact missing locations...');

content = content.replace(
  /(required:\s*\[[^\]]*\])(\s*\},)/g,
  '$1,\n          "additionalProperties": false$2'
);

// Write the fixed content
fs.writeFileSync(SERVER_FILE, content);

// Count after
const finalContent = fs.readFileSync(SERVER_FILE, 'utf8');
const afterRequired = (finalContent.match(/required:\s*\[/g) || []).length;
const afterAdditionalProps = (finalContent.match(/additionalProperties/g) || []).length;

console.log(`📊 After: ${afterRequired} required, ${afterAdditionalProps} additionalProperties`);

if (afterRequired === afterAdditionalProps) {
  console.log('🎉 SUCCESS: All schemas with required now have additionalProperties!');
} else {
  console.log('⚠️  Some schemas may still be missing additionalProperties');
}

console.log('');
console.log('🧪 Test: node server-markdown.js');
console.log('🧪 Test: claude (should fix tool #45 error)');
console.log(`🔄 Restore: cp ${BACKUP_FILE} server-markdown.js`);
