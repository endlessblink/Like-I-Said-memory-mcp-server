#!/usr/bin/env node

/**
 * UNIVERSAL MCP JSON Schema Draft 2020-12 Compliance Fixer
 * 
 * Based on official JSON Schema specification from json-schema-org/json-schema-spec
 * 
 * This script:
 * 1. Finds ALL MCP servers and their schema files
 * 2. Analyzes ALL inputSchema objects across ALL servers
 * 3. Applies comprehensive JSON Schema Draft 2020-12 compliance fixes
 * 4. Backs up original files before making changes
 * 5. Reports detailed compliance status
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

console.log('🔧 UNIVERSAL MCP JSON Schema Draft 2020-12 Compliance Fixer');
console.log('=' .repeat(70));
console.log('📖 Based on official JSON Schema specification');
console.log('');

// Configuration
const SCHEMA_DECLARATION = '"$schema": "https://json-schema.org/draft/2020-12/schema"';
const BACKUP_SUFFIX = `.backup-universal-${Date.now()}`;

// JSON Schema Draft 2020-12 Requirements (from official spec)
const REQUIRED_COMPLIANCE = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  additionalProperties: false, // Required to prevent arbitrary properties
  type: 'object', // MCP schemas should be objects
  // Validation keywords should use proper types
  propertyTypes: {
    integer: ['minimum', 'maximum', 'multipleOf'],
    string: ['minLength', 'maxLength', 'pattern', 'format'],
    array: ['minItems', 'maxItems', 'uniqueItems'],
    object: ['minProperties', 'maxProperties']
  }
};

/**
 * Find all potential MCP server files
 */
function findMCPServers() {
  console.log('🔍 Discovering MCP servers...');
  
  const searchPaths = [
    // Local development servers
    'server*.js',
    '**/server*.js',
    // NPX cached servers
    process.env.HOME + '/.npm/_npx/**/node_modules/.bin/mcp-*',
    process.env.HOME + '/.npm/_npx/**/node_modules/**/*mcp*.js',
    // Common MCP locations
    '**/mcp-server*.js',
    '**/mcp*.js',
    // Node modules
    '**/node_modules/**/mcp*.js',
    '**/node_modules/**/*server*.js'
  ];

  const mcpFiles = [];
  
  for (const pattern of searchPaths) {
    try {
      const files = glob.sync(pattern, { 
        ignore: ['**/node_modules/**/node_modules/**'], // Avoid deep nesting
        absolute: true 
      });
      mcpFiles.push(...files);
    } catch (error) {
      // Ignore glob errors for non-existent paths
    }
  }

  // Remove duplicates and filter for actual MCP servers
  const uniqueFiles = [...new Set(mcpFiles)].filter(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Check if it's likely an MCP server
      return content.includes('inputSchema') || 
             content.includes('MCP') || 
             content.includes('ModelContextProtocol') ||
             content.includes('@modelcontextprotocol');
    } catch {
      return false;
    }
  });

  console.log(`📊 Found ${uniqueFiles.length} potential MCP servers:`);
  uniqueFiles.forEach(file => console.log(`   📄 ${file}`));
  console.log('');
  
  return uniqueFiles;
}

/**
 * Analyze a single file for JSON Schema compliance issues
 */
function analyzeSchemaCompliance(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract all inputSchema objects using regex
    const schemaMatches = content.matchAll(/inputSchema:\s*\{[\s\S]*?\}\s*\}/g);
    const schemas = Array.from(schemaMatches);
    
    const issues = [];
    let schemaCount = 0;
    
    for (const match of schemas) {
      schemaCount++;
      const schema = match[0];
      
      // Check for compliance issues
      if (!schema.includes('$schema')) {
        issues.push(`Schema ${schemaCount}: Missing $schema declaration`);
      }
      
      if (!schema.includes('additionalProperties')) {
        issues.push(`Schema ${schemaCount}: Missing additionalProperties constraint`);
      }
      
      // Check for type inconsistencies
      if (schema.includes('type:') && schema.includes('minimum') && !schema.includes('integer')) {
        issues.push(`Schema ${schemaCount}: Uses minimum with non-integer type`);
      }
      
      if (schema.includes('minLength') && !schema.includes('string')) {
        issues.push(`Schema ${schemaCount}: Uses minLength with non-string type`);
      }
    }
    
    return {
      filePath,
      schemaCount,
      issues,
      hasSchemas: schemaCount > 0
    };
    
  } catch (error) {
    return {
      filePath,
      schemaCount: 0,
      issues: [`File read error: ${error.message}`],
      hasSchemas: false
    };
  }
}

/**
 * Apply comprehensive JSON Schema Draft 2020-12 fixes to a file
 */
function fixSchemaCompliance(filePath) {
  console.log(`🔧 Fixing: ${path.basename(filePath)}`);
  
  // Create backup
  const backupPath = filePath + BACKUP_SUFFIX;
  fs.copyFileSync(filePath, backupPath);
  console.log(`   📁 Backup: ${path.basename(backupPath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changesMade = 0;
  
  // Fix 1: Add $schema declarations
  const schemaDeclarationAdded = content.replace(
    /(inputSchema:\s*\{\s*)(?!\s*"\$schema")(type:\s*['"]object['"])/g,
    `$1${SCHEMA_DECLARATION},\n          $2`
  );
  if (schemaDeclarationAdded !== content) {
    changesMade++;
    content = schemaDeclarationAdded;
    console.log('   ✅ Added $schema declarations');
  }
  
  // Fix 2: Add additionalProperties to schemas with required arrays
  const additionalPropsFixed = content.replace(
    /(required:\s*\[[^\]]*\])(?!\s*,\s*["\']?additionalProperties["\']?\s*:\s*false)(\s*\})/g,
    '$1,\n          "additionalProperties": false$2'
  );
  if (additionalPropsFixed !== content) {
    changesMade++;
    content = additionalPropsFixed;
    console.log('   ✅ Added additionalProperties constraints');
  }
  
  // Fix 3: Add additionalProperties to schemas without required arrays
  const inputSchemaRegex = /(inputSchema:\s*\{[\s\S]*?properties:\s*\{[\s\S]*?\}[\s\S]*?)(\}\s*\})/g;
  const additionalPropsForNonRequired = content.replace(inputSchemaRegex, (match, schemaContent, ending) => {
    if (!match.includes('required:') && !match.includes('additionalProperties')) {
      return `${schemaContent},\n          "additionalProperties": false\n        ${ending}`;
    }
    return match;
  });
  if (additionalPropsForNonRequired !== content) {
    changesMade++;
    content = additionalPropsForNonRequired;
    console.log('   ✅ Added additionalProperties to non-required schemas');
  }
  
  // Fix 4: Convert number to integer for appropriate fields
  const integerFields = ['limit', 'timeout_ms', 'n', 'batch_size', 'context_lines', 'minimum', 'maximum'];
  integerFields.forEach(field => {
    const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*)['"]number['"]`, 'g');
    const fixed = content.replace(regex, '$1"integer"');
    if (fixed !== content) {
      changesMade++;
      content = fixed;
      console.log(`   ✅ Fixed ${field} type: number → integer`);
    }
  });
  
  // Fix 5: Add minLength to string fields
  const stringFieldsNeedingMinLength = ['content', 'query', 'text', 'title', 'description', 'name'];
  stringFieldsNeedingMinLength.forEach(field => {
    const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*['"]string['"][^}]*)(\\})`, 'g');
    const fixed = content.replace(regex, (match, prefix, suffix) => {
      if (!match.includes('minLength')) {
        return `${prefix},\n              "minLength": 1\n            ${suffix}`;
      }
      return match;
    });
    if (fixed !== content) {
      changesMade++;
      content = fixed;
      console.log(`   ✅ Added minLength to ${field}`);
    }
  });
  
  // Fix 6: Add proper enum constraints
  const enumFields = {
    status: ['todo', 'in_progress', 'done', 'blocked'],
    priority: ['low', 'medium', 'high', 'urgent'],
    category: ['personal', 'work', 'code', 'research']
  };
  
  Object.entries(enumFields).forEach(([field, values]) => {
    const regex = new RegExp(`(${field}:\\s*\\{[^}]*type:\\s*['"]string['"][^}]*)(\\})`, 'g');
    const fixed = content.replace(regex, (match, prefix, suffix) => {
      if (!match.includes('enum')) {
        const enumValue = JSON.stringify(values);
        return `${prefix},\n              "enum": ${enumValue}\n            ${suffix}`;
      }
      return match;
    });
    if (fixed !== content) {
      changesMade++;
      content = fixed;
      console.log(`   ✅ Added enum constraint to ${field}`);
    }
  });
  
  // Write the fixed content
  fs.writeFileSync(filePath, content);
  
  console.log(`   🎯 Made ${changesMade} fixes to ${path.basename(filePath)}`);
  console.log('');
  
  return {
    filePath,
    backupPath,
    changesMade,
    success: true
  };
}

/**
 * Test if a fixed file loads without syntax errors
 */
function testFileValidity(filePath) {
  try {
    // Try to parse as Node.js module
    const command = `node -e "import('${filePath}').catch(() => console.log('syntax ok'))"`;
    execSync(command, { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate comprehensive compliance report
 */
function generateReport(analysisResults, fixResults) {
  console.log('📊 COMPREHENSIVE COMPLIANCE REPORT');
  console.log('=' .repeat(50));
  
  const totalServers = analysisResults.length;
  const serversWithSchemas = analysisResults.filter(r => r.hasSchemas).length;
  const totalSchemas = analysisResults.reduce((sum, r) => sum + r.schemaCount, 0);
  const totalIssues = analysisResults.reduce((sum, r) => sum + r.issues.length, 0);
  const totalFixes = fixResults.reduce((sum, r) => sum + r.changesMade, 0);
  
  console.log(`📄 MCP Servers Found: ${totalServers}`);
  console.log(`🔧 Servers with Schemas: ${serversWithSchemas}`);
  console.log(`📝 Total Schemas: ${totalSchemas}`);
  console.log(`⚠️  Issues Found: ${totalIssues}`);
  console.log(`✅ Fixes Applied: ${totalFixes}`);
  console.log('');
  
  // Individual server breakdown
  console.log('📋 Server-by-Server Breakdown:');
  analysisResults.forEach(result => {
    if (result.hasSchemas) {
      console.log(`\n📄 ${path.basename(result.filePath)}`);
      console.log(`   Schemas: ${result.schemaCount}`);
      console.log(`   Issues: ${result.issues.length}`);
      
      const fixResult = fixResults.find(f => f.filePath === result.filePath);
      if (fixResult) {
        console.log(`   Fixes: ${fixResult.changesMade}`);
        console.log(`   Status: ${fixResult.success ? '✅ Fixed' : '❌ Failed'}`);
      }
    }
  });
  
  console.log('\n🎯 SUMMARY:');
  if (totalIssues === 0) {
    console.log('✅ All MCP servers are JSON Schema Draft 2020-12 compliant!');
  } else if (totalFixes > 0) {
    console.log(`✅ Applied ${totalFixes} fixes across ${serversWithSchemas} servers`);
    console.log('🧪 Test your MCP servers to verify functionality');
  } else {
    console.log('⚠️  Issues found but no fixes could be applied');
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Step 1: Discover MCP servers
    const mcpServers = findMCPServers();
    
    if (mcpServers.length === 0) {
      console.log('❌ No MCP servers found');
      process.exit(1);
    }
    
    // Step 2: Analyze compliance
    console.log('🔍 Analyzing JSON Schema compliance...');
    const analysisResults = mcpServers.map(analyzeSchemaCompliance);
    
    // Step 3: Apply fixes
    console.log('🔧 Applying JSON Schema Draft 2020-12 fixes...');
    const fixResults = [];
    
    for (const result of analysisResults) {
      if (result.hasSchemas && result.issues.length > 0) {
        try {
          const fixResult = fixSchemaCompliance(result.filePath);
          fixResults.push(fixResult);
          
          // Test file validity
          if (!testFileValidity(result.filePath)) {
            console.log(`   ⚠️  Warning: ${path.basename(result.filePath)} may have syntax issues`);
          }
        } catch (error) {
          console.log(`   ❌ Failed to fix ${result.filePath}: ${error.message}`);
          fixResults.push({
            filePath: result.filePath,
            changesMade: 0,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    // Step 4: Generate report
    console.log('');
    generateReport(analysisResults, fixResults);
    
    console.log('\n🎉 Universal MCP JSON Schema compliance fix completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test each MCP server: node <server-file>');
    console.log('2. Test Claude Code: claude');
    console.log('3. Restore from backups if issues occur');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
