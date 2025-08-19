#!/usr/bin/env node

/**
 * MINIMAL SAFE JSON Schema Draft 2020-12 Compliance Fix
 * Only adds the essential elements to pass compliance without breaking syntax
 */

import fs from 'fs';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-minimal-${Date.now()}`;

console.log('🔧 MINIMAL SAFE JSON Schema Fix');
console.log('=' .repeat(40));

// Backup
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
console.log(`📁 Backup: ${BACKUP_FILE}`);

let content = fs.readFileSync(SERVER_FILE, 'utf8');

console.log('🔍 Applying minimal essential fixes...');

// Fix 1: Add $schema to all inputSchema objects (safe replacement)
console.log('✅ Adding $schema declarations');
content = content.replace(
  /(inputSchema:\s*\{\s*)(type:\s*['"]object['"])/g,
  '$1"$schema": "https://json-schema.org/draft/2020-12/schema",\n          $2'
);

// Fix 2: Add additionalProperties ONLY after required arrays (safest approach)
console.log('✅ Adding additionalProperties after required arrays');
content = content.replace(
  /(required:\s*\[[^\]]*\])(\s*\})/g,
  '$1,\n          "additionalProperties": false$2'
);

fs.writeFileSync(SERVER_FILE, content);

console.log('');
console.log('🎉 Minimal fixes applied!');
console.log('✅ Added $schema to all inputSchema objects');
console.log('✅ Added additionalProperties to schemas with required arrays');
console.log('');
console.log('🧪 Test: node server-markdown.js');
console.log(`🔄 Restore: cp ${BACKUP_FILE} server-markdown.js`);
