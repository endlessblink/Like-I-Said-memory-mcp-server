#!/usr/bin/env node

/**
 * NPX CACHE MCP JSON Schema Fixer
 * Targets NPX cached MCP servers that weren't caught by the universal fixer
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🎯 NPX CACHE MCP JSON Schema Fixer');
console.log('=' .repeat(50));

const NPX_CACHE_DIR = process.env.HOME + '/.npm/_npx';
const BACKUP_SUFFIX = `.backup-npx-${Date.now()}`;

/**
 * Apply JSON Schema Draft 2020-12 fixes to NPX cached files
 */
function fixNPXCachedSchemas() {
  try {
    // Find files with inputSchema in NPX cache
    const findCommand = `find ${NPX_CACHE_DIR} -name '*.js' -exec grep -l 'inputSchema' {} + 2>/dev/null`;
    const files = execSync(findCommand, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📊 Found ${files.length} NPX cached files with schemas:`);
    
    let totalFixes = 0;
    
    for (const filePath of files) {
      if (!filePath || !fs.existsSync(filePath)) continue;
      
      console.log(`🔧 Checking: ${path.basename(filePath)}`);
      
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let changesMade = 0;
        
        // Skip if file looks like it's already been processed
        if (content.includes('https://json-schema.org/draft/2020-12/schema')) {
          console.log('   ✅ Already compliant');
          continue;
        }
        
        // Create backup
        const backupPath = filePath + BACKUP_SUFFIX;
        fs.copyFileSync(filePath, backupPath);
        
        // Fix 1: Add $schema declarations (for object schemas only)
        const schemaFixed = content.replace(
          /(inputSchema:\s*\{\s*)(type:\s*['"]object['"])/g,
          '$1"$schema": "https://json-schema.org/draft/2020-12/schema",\n            $2'
        );
        if (schemaFixed !== content) {
          changesMade++;
          content = schemaFixed;
          console.log('   ✅ Added $schema declarations');
        }
        
        // Fix 2: Add additionalProperties to schemas with required arrays
        const additionalPropsFixed = content.replace(
          /(required:\s*\[[^\]]*\])(?!\s*,\s*["\']?additionalProperties["\']?\s*:\s*false)(\s*\})/g,
          '$1,\n            "additionalProperties": false$2'
        );
        if (additionalPropsFixed !== content) {
          changesMade++;
          content = additionalPropsFixed;
          console.log('   ✅ Added additionalProperties constraints');
        }
        
        // Fix 3: Add additionalProperties to object schemas without required
        const objectSchemaRegex = /(inputSchema:\s*\{[^}]*type:\s*['"]object['"][^}]*properties:\s*\{[^}]*\}[^}]*?)(\}\s*[,}])/g;
        const additionalPropsForObjects = content.replace(objectSchemaRegex, (match, schemaContent, ending) => {
          if (!match.includes('required:') && !match.includes('additionalProperties')) {
            return `${schemaContent},\n            "additionalProperties": false\n        ${ending}`;
          }
          return match;
        });
        if (additionalPropsForObjects !== content) {
          changesMade++;
          content = additionalPropsForObjects;
          console.log('   ✅ Added additionalProperties to object schemas');
        }
        
        // Write changes if any were made
        if (changesMade > 0) {
          fs.writeFileSync(filePath, content);
          console.log(`   🎯 Applied ${changesMade} fixes`);
          totalFixes += changesMade;
        } else {
          // Remove backup if no changes were made
          fs.unlinkSync(backupPath);
          console.log('   ➡️  No changes needed');
        }
        
      } catch (error) {
        console.log(`   ❌ Error fixing ${filePath}: ${error.message}`);
      }
    }
    
    console.log('');
    console.log(`🎉 NPX Cache fix completed!`);
    console.log(`✅ Applied ${totalFixes} total fixes`);
    console.log('');
    
    return totalFixes;
    
  } catch (error) {
    console.error('❌ Error scanning NPX cache:', error.message);
    return 0;
  }
}

// Execute the fix
const fixes = fixNPXCachedSchemas();

if (fixes > 0) {
  console.log('🔄 Killing all MCP processes to force restart with fixed schemas...');
  try {
    execSync('pkill -f mcp', { stdio: 'ignore' });
    execSync('pkill -f context7', { stdio: 'ignore' });
    execSync('pkill -f playwright', { stdio: 'ignore' });
    execSync('pkill -f puppeteer', { stdio: 'ignore' });
    console.log('✅ Processes killed - they will restart with fixed schemas');
  } catch {
    // Ignore kill errors
  }
}

console.log('');
console.log('🧪 Now test Claude Code again - tool #71 error should be resolved!');
