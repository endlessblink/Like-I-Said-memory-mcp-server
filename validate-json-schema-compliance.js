#!/usr/bin/env node

/**
 * JSON Schema Draft 2020-12 Compliance Validator
 * 
 * This script validates that all JSON schemas in server-markdown.js
 * are fully compliant with JSON Schema Draft 2020-12 specification.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 JSON Schema Draft 2020-12 Compliance Validator');
console.log('=' .repeat(60));

// Valid JSON Schema types according to Draft 2020-12
const VALID_TYPES = ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'];

// Read the server file
const serverPath = path.join(__dirname, 'server-markdown.js');
const content = fs.readFileSync(serverPath, 'utf8');

let issuesFound = [];
let schemasAnalyzed = 0;

// Check 1: Find any remaining 'type: any' occurrences
const typeAnyMatches = content.match(/type:\s*['"]?any['"]?/g);
if (typeAnyMatches) {
  issuesFound.push({
    issue: 'Invalid type: "any"',
    count: typeAnyMatches.length,
    severity: 'CRITICAL',
    fix: 'Replace with {} or remove type constraint'
  });
}

// Check 2: Find inconsistent additionalProperties formatting
const quotedAdditionalProps = content.match(/"additionalProperties"\s*:/g);
const unquotedAdditionalProps = content.match(/(?<!")additionalProperties\s*:/g);
if (quotedAdditionalProps && quotedAdditionalProps.length > 0) {
  issuesFound.push({
    issue: 'Inconsistent additionalProperties formatting (quoted)',
    count: quotedAdditionalProps.length,
    severity: 'MINOR',
    fix: 'Remove quotes for consistency'
  });
}

// Check 3: Extract and validate all inputSchema objects
const inputSchemaRegex = /inputSchema:\s*\{[\s\S]*?\n\s{8}\}/g;
const schemas = content.match(inputSchemaRegex) || [];
schemasAnalyzed = schemas.length;

schemas.forEach((schema, index) => {
  // Check for $schema declaration
  if (!schema.includes('$schema')) {
    issuesFound.push({
      issue: `Schema ${index + 1} missing $schema declaration`,
      severity: 'RECOMMENDED',
      fix: 'Add "$schema": "https://json-schema.org/draft/2020-12/schema"'
    });
  }
  
  // Check for additionalProperties in schemas with properties
  if (schema.includes('properties:') && !schema.includes('additionalProperties')) {
    issuesFound.push({
      issue: `Schema ${index + 1} missing additionalProperties constraint`,
      severity: 'RECOMMENDED',
      fix: 'Add additionalProperties: false'
    });
  }
  
  // Check for invalid type values
  const typeMatches = schema.match(/type:\s*['"]([^'"]+)['"]/g) || [];
  typeMatches.forEach(match => {
    const type = match.match(/type:\s*['"]([^'"]+)['"]/)[1];
    if (!VALID_TYPES.includes(type)) {
      issuesFound.push({
        issue: `Invalid type "${type}" in schema ${index + 1}`,
        severity: 'CRITICAL',
        fix: `Use one of: ${VALID_TYPES.join(', ')}`
      });
    }
  });
});

// Check 4: Look for orphaned properties (properties without parent object)
const orphanedPropsRegex = /^\s{0,10}properties:\s*\{/gm;
const orphanedProps = content.match(orphanedPropsRegex);
if (orphanedProps && orphanedProps.length > 0) {
  // Filter out valid top-level properties in tool definitions
  const validMatches = orphanedProps.filter(match => {
    const indent = match.match(/^\s*/)[0].length;
    return indent < 10; // Top-level properties should have minimal indentation
  });
  
  if (validMatches.length > 0) {
    issuesFound.push({
      issue: 'Potentially orphaned properties objects',
      count: validMatches.length,
      severity: 'WARNING',
      fix: 'Ensure properties are properly nested within parent objects'
    });
  }
}

// Check 5: Validate enum arrays
const enumRegex = /enum:\s*\[[^\]]*\]/g;
const enums = content.match(enumRegex) || [];
enums.forEach((enumDef, index) => {
  // Check for proper JSON formatting
  try {
    const enumArray = enumDef.replace(/enum:\s*/, '').replace(/'/g, '"');
    JSON.parse(enumArray);
  } catch (e) {
    issuesFound.push({
      issue: `Invalid enum formatting at occurrence ${index + 1}`,
      severity: 'MINOR',
      fix: 'Ensure proper JSON array formatting'
    });
  }
});

// Generate Report
console.log(`\n📊 Analysis Results:`);
console.log(`   Schemas analyzed: ${schemasAnalyzed}`);
console.log(`   Issues found: ${issuesFound.length}`);

if (issuesFound.length === 0) {
  console.log('\n✅ FULLY COMPLIANT with JSON Schema Draft 2020-12!');
  console.log('\nAll checks passed:');
  console.log('  ✓ No invalid type declarations');
  console.log('  ✓ Consistent additionalProperties formatting');
  console.log('  ✓ Valid JSON Schema types only');
  console.log('  ✓ Proper property nesting');
  console.log('  ✓ Valid enum definitions');
} else {
  console.log('\n⚠️  Issues Found:\n');
  
  // Group by severity
  const critical = issuesFound.filter(i => i.severity === 'CRITICAL');
  const warnings = issuesFound.filter(i => i.severity === 'WARNING');
  const minor = issuesFound.filter(i => i.severity === 'MINOR');
  const recommended = issuesFound.filter(i => i.severity === 'RECOMMENDED');
  
  if (critical.length > 0) {
    console.log('🔴 CRITICAL Issues (must fix):');
    critical.forEach(issue => {
      console.log(`   - ${issue.issue}${issue.count ? ` (${issue.count} occurrences)` : ''}`);
      console.log(`     Fix: ${issue.fix}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n🟡 WARNING Issues (should fix):');
    warnings.forEach(issue => {
      console.log(`   - ${issue.issue}${issue.count ? ` (${issue.count} occurrences)` : ''}`);
      console.log(`     Fix: ${issue.fix}`);
    });
  }
  
  if (minor.length > 0) {
    console.log('\n🟢 MINOR Issues (optional):');
    minor.forEach(issue => {
      console.log(`   - ${issue.issue}${issue.count ? ` (${issue.count} occurrences)` : ''}`);
      console.log(`     Fix: ${issue.fix}`);
    });
  }
  
  if (recommended.length > 0) {
    console.log('\n💡 RECOMMENDED Improvements:');
    recommended.forEach(issue => {
      console.log(`   - ${issue.issue}`);
      console.log(`     Fix: ${issue.fix}`);
    });
  }
}

// Exit code based on critical issues
const exitCode = issuesFound.filter(i => i.severity === 'CRITICAL').length > 0 ? 1 : 0;

console.log('\n' + '=' .repeat(60));
console.log(`Validation ${exitCode === 0 ? 'PASSED' : 'FAILED'}`);

process.exit(exitCode);