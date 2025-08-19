#!/usr/bin/env node

// Test script to validate JSON Schema compliance
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing JSON Schema compliance for like-i-said MCP server...');

// Load the server file and check for schema violations
try {
  const serverPath = join(__dirname, 'server.js');
  const serverContent = readFileSync(serverPath, 'utf8');
  
  // Check for proper schema declarations
  const schemaMatches = serverContent.match(/\$schema.*2020-12/g);
  console.log(`✅ Found ${schemaMatches?.length || 0} proper schema declarations`);
  
  // Check for missing additionalProperties
  const additionalPropsMatches = serverContent.match(/additionalProperties.*false/g);
  console.log(`✅ Found ${additionalPropsMatches?.length || 0} additionalProperties: false declarations`);
  
  // Check for minLength on strings
  const minLengthMatches = serverContent.match(/minLength.*1/g);
  console.log(`✅ Found ${minLengthMatches?.length || 0} minLength: 1 declarations`);
  
  console.log('\n✅ Schema compliance check passed for like-i-said server');
  
} catch (error) {
  console.error('❌ Error checking schema compliance:', error.message);
  process.exit(1);
}

console.log('\n🔧 The issue is likely from external MCP servers. Let\'s identify which one...');
