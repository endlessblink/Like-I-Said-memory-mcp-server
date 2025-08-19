#!/usr/bin/env node

/**
 * COMPREHENSIVE JSON Schema Draft 2020-12 Compliance Fix
 * Addresses ALL remaining compliance issues for tool #45 error
 */

import fs from 'fs';

const SERVER_FILE = 'server-markdown.js';
const BACKUP_FILE = `${SERVER_FILE}.backup-comprehensive-${Date.now()}`;

console.log('🔧 COMPREHENSIVE JSON Schema Draft 2020-12 Compliance Fix');
console.log('=' .repeat(65));

// Backup
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
console.log(`📁 Backup: ${BACKUP_FILE}`);

let content = fs.readFileSync(SERVER_FILE, 'utf8');

// Check current state
const schemasWithRequired = (content.match(/required:\s*\[/g) || []).length;
const schemasWithAdditionalProps = (content.match(/additionalProperties/g) || []).length;
const schemasWithSchema = (content.match(/"\$schema":/g) || []).length;

console.log(`📊 Current state:`);
console.log(`   - Schemas with required: ${schemasWithRequired}`);
console.log(`   - Schemas with additionalProperties: ${schemasWithAdditionalProps}`);
console.log(`   - Schemas with $schema: ${schemasWithSchema}`);
console.log('');

console.log('🔍 Applying comprehensive fixes...');

// Fix 1: Ensure ALL inputSchema objects have $schema (re-apply to catch any missed)
console.log('✅ Fix 1: Ensuring ALL $schema declarations');
content = content.replace(
  /(inputSchema:\s*\{\s*)(?![\s\S]*?"\$schema")(type:\s*['"]object['"])/g,
  '$1"$schema": "https://json-schema.org/draft/2020-12/schema",\n          $2'
);

// Fix 2: Add additionalProperties to ALL schemas with required (more thorough)
console.log('✅ Fix 2: Adding additionalProperties to ALL required schemas');
content = content.replace(
  /(required:\s*\[[^\]]*\])(?!\s*,\s*["\']?additionalProperties["\']?\s*:\s*false)(\s*\})/g,
  '$1,\n          "additionalProperties": false$2'
);

// Fix 3: Add additionalProperties to schemas WITHOUT required arrays but with properties
console.log('✅ Fix 3: Adding additionalProperties to schemas without required');
// Find inputSchema blocks that have properties but no required and no additionalProperties
const inputSchemaRegex = /(inputSchema:\s*\{[\s\S]*?properties:\s*\{[\s\S]*?\}[\s\S]*?)(\}\s*\})/g;
content = content.replace(inputSchemaRegex, (match, schemaContent, ending) => {
  // Skip if already has required or additionalProperties
  if (match.includes('required:') || match.includes('additionalProperties')) {
    return match;
  }
  
  // Add additionalProperties before the ending
  return `${schemaContent},\n          "additionalProperties": false\n        ${ending}`;
});

// Write the fixed content
fs.writeFileSync(SERVER_FILE, content);

// Check final state
const finalContent = fs.readFileSync(SERVER_FILE, 'utf8');
const finalSchemasWithRequired = (finalContent.match(/required:\s*\[/g) || []).length;
const finalSchemasWithAdditionalProps = (finalContent.match(/additionalProperties/g) || []).length;
const finalSchemasWithSchema = (finalContent.match(/"\$schema":/g) || []).length;

console.log('');
console.log('🎉 Comprehensive fixes applied!');
console.log('');
console.log(`📊 Final state:`);
console.log(`   - Schemas with required: ${finalSchemasWithRequired}`);
console.log(`   - Schemas with additionalProperties: ${finalSchemasWithAdditionalProps}`);
console.log(`   - Schemas with $schema: ${finalSchemasWithSchema}`);
console.log('');

if (finalSchemasWithRequired === finalSchemasWithAdditionalProps) {
  console.log('✅ SUCCESS: All schemas with required now have additionalProperties!');
} else {
  console.log('⚠️  WARNING: Some schemas may still be missing additionalProperties');
}

console.log('');
console.log('🧪 Test commands:');
console.log('  1. node server-markdown.js');
console.log('  2. claude (should not get tool #45 error)');
console.log('');
console.log(`🔄 Restore if needed: cp ${BACKUP_FILE} server-markdown.js`);
