#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll use dynamic imports for CommonJS modules
async function loadDependencies() {
  const { default: migrate } = await import('json-schema-migrate');
  const { default: Ajv2020 } = await import('ajv/dist/2020.js');
  const { default: addFormats } = await import('ajv-formats');
  
  return { migrate, Ajv2020, addFormats };
}

async function fixMcpServerSchemas() {
  const { migrate, Ajv2020, addFormats } = await loadDependencies();
  
  // Create AJV instance for validation
  const ajv = new Ajv2020.default({ strict: false, allErrors: true });
  addFormats.default(ajv);
  
  console.log('🔧 Starting MCP Server Schema Fix...\n');
  
  // Process server-markdown.js
  const serverPath = path.join(__dirname, 'server-markdown.js');
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Fix server-markdown.js tools
  const { content: fixedServerContent, count: serverFixCount } = await fixFileSchemas(
    serverContent, 
    'server-markdown.js',
    migrate,
    ajv
  );
  
  // Process lib/v3-mcp-tools.js
  const v3Path = path.join(__dirname, 'lib', 'v3-mcp-tools.js');
  let v3Content = fs.readFileSync(v3Path, 'utf8');
  
  const { content: fixedV3Content, count: v3FixCount } = await fixFileSchemas(
    v3Content,
    'v3-mcp-tools.js',
    migrate,
    ajv
  );
  
  // Write fixed files
  fs.writeFileSync(serverPath, fixedServerContent);
  fs.writeFileSync(v3Path, fixedV3Content);
  
  console.log(`\n✅ Fixed ${serverFixCount} schemas in server-markdown.js`);
  console.log(`✅ Fixed ${v3FixCount} schemas in v3-mcp-tools.js`);
  console.log(`✅ Total: ${serverFixCount + v3FixCount} schemas fixed`);
}

async function fixFileSchemas(content, filename, migrate, ajv) {
  console.log(`📄 Processing ${filename}...`);
  
  let fixedContent = content;
  let fixCount = 0;
  
  // Find all inputSchema definitions
  const schemaRegex = /inputSchema:\s*{([^}]*(?:{[^}]*}[^}]*)*)}/g;
  const matches = [];
  let match;
  
  while ((match = schemaRegex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // Process matches in reverse order to maintain indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, start, end } = matches[i];
    
    try {
      // Extract the schema object
      const schemaStr = fullMatch.replace('inputSchema:', '').trim();
      
      // Parse the schema (handle JavaScript object notation)
      const schema = eval(`(${schemaStr})`);
      
      // Fix the schema
      const fixedSchema = fixToolSchema(schema, migrate);
      
      // Validate with AJV
      const valid = ajv.validateSchema(fixedSchema);
      if (!valid) {
        console.warn(`  ⚠️ Schema validation warning: ${ajv.errorsText()}`);
      }
      
      // Convert back to JavaScript object notation
      const fixedSchemaStr = objectToJsNotation(fixedSchema, 4);
      
      // Replace in content
      fixedContent = fixedContent.substring(0, start) + 
                     `inputSchema: ${fixedSchemaStr}` +
                     fixedContent.substring(end);
      
      fixCount++;
      console.log(`  ✓ Fixed schema at position ${start}`);
      
    } catch (error) {
      console.error(`  ✗ Failed to fix schema at position ${start}: ${error.message}`);
    }
  }
  
  return { content: fixedContent, count: fixCount };
}

function fixToolSchema(schema, migrate) {
  // Clone the schema
  const fixed = JSON.parse(JSON.stringify(schema));
  
  // 1. Add $schema if missing
  if (!fixed['$schema']) {
    fixed['$schema'] = "https://json-schema.org/draft/2020-12/schema";
  }
  
  // 2. Migrate to draft 2020-12
  try {
    migrate.draft2020(fixed);
  } catch (e) {
    // Migration might fail for already compliant schemas
    console.log('  Migration skipped (already compliant or not needed)');
  }
  
  // 3. Fix additionalProperties placement
  if (fixed.type === 'object' || !fixed.type) {
    // Ensure additionalProperties at root level
    if (!fixed.hasOwnProperty('additionalProperties')) {
      fixed.additionalProperties = false;
    }
    
    // Fix nested objects
    if (fixed.properties) {
      fixNestedProperties(fixed.properties);
    }
  }
  
  return fixed;
}

function fixNestedProperties(properties) {
  Object.keys(properties).forEach(key => {
    const prop = properties[key];
    
    // Remove misplaced additionalProperties from non-object properties
    if (prop.additionalProperties !== undefined) {
      if (prop.type !== 'object') {
        delete prop.additionalProperties;
      }
    }
    
    // For nested objects, ensure correct structure
    if (prop.type === 'object' && prop.properties) {
      // Add additionalProperties to nested objects if missing
      if (!prop.hasOwnProperty('additionalProperties')) {
        prop.additionalProperties = false;
      }
      // Recursively fix nested properties
      fixNestedProperties(prop.properties);
    }
  });
}

function objectToJsNotation(obj, indentLevel = 0) {
  const indent = '  '.repeat(indentLevel);
  const innerIndent = '  '.repeat(indentLevel + 1);
  
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map(item => objectToJsNotation(item, indentLevel + 1));
    return `[\n${innerIndent}${items.join(`,\n${innerIndent}`)}\n${indent}]`;
  }
  
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  
  const lines = entries.map(([key, value]) => {
    // Handle special keys that need quotes
    const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && !['$schema'].includes(key) 
      ? key 
      : JSON.stringify(key);
    
    const valueStr = objectToJsNotation(value, indentLevel + 1);
    return `${innerIndent}${keyStr}: ${valueStr}`;
  });
  
  return `{\n${lines.join(',\n')}\n${indent}}`;
}

// Run the fixer
fixMcpServerSchemas()
  .then(() => {
    console.log('\n🎉 Schema fix completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Schema fix failed:', error);
    process.exit(1);
  });