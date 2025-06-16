#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function migrateFromJson() {
  const oldJsonPath = path.join(process.cwd(), 'memory.json');
  
  // Check if old JSON file exists
  if (!fs.existsSync(oldJsonPath)) {
    log('No memory.json found - nothing to migrate', 'yellow');
    return;
  }

  log('🔄 Starting migration from memory.json to Markdown format...', 'blue');

  try {
    // Read old JSON data
    const oldData = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8'));
    const entries = Object.entries(oldData);
    
    if (entries.length === 0) {
      log('memory.json is empty - nothing to migrate', 'yellow');
      return;
    }

    log(`Found ${entries.length} memories to migrate`, 'blue');

    // Initialize memory manager
    const memoryManager = new MemoryManager({
      baseDir: path.join(process.cwd(), 'memories'),
      project: 'migrated-data',
      sandboxed: false // Allow migration
    });

    let migrated = 0;
    let errors = 0;

    // Migrate each memory
    for (const [key, memory] of entries) {
      try {
        // Extract metadata from old format
        const context = memory.context || {};
        
        // Determine scope (default to project for old memories)
        const scope = context.scope || 'project';
        
        // Extract tags from various sources
        const tags = [];
        if (Array.isArray(context.tags)) tags.push(...context.tags);
        if (context.category) tags.push(context.category);
        if (context.type) tags.push(context.type);
        
        // Extract links (if they exist)
        const links = context.links || [];

        // Create new context for the memory manager
        const newContext = {
          scope,
          title: context.title || key,
          tags: [...new Set(tags)], // Remove duplicates
          links,
          migratedFrom: 'memory.json',
          originalTimestamp: memory.timestamp
        };

        // Add memory to new system
        await memoryManager.addMemory(key, memory.value, newContext);
        migrated++;
        
        log(`  ✓ Migrated: ${key}`, 'green');
      } catch (error) {
        log(`  ✗ Failed to migrate ${key}: ${error.message}`, 'red');
        errors++;
      }
    }

    // Create backup of original file
    const backupPath = `${oldJsonPath}.backup.${Date.now()}`;
    fs.copyFileSync(oldJsonPath, backupPath);
    log(`📁 Created backup: ${backupPath}`, 'blue');

    // Summary
    log('\n📊 Migration Summary:', 'blue');
    log(`  ✅ Successfully migrated: ${migrated}`, 'green');
    if (errors > 0) log(`  ❌ Failed migrations: ${errors}`, 'red');
    log(`  📁 Original data backed up to: ${path.basename(backupPath)}`, 'yellow');
    
    if (migrated > 0) {
      log('\n🎉 Migration completed!', 'green');
      log('Your memories are now available in the new Markdown format:', 'blue');
      log(`  📂 Global memories: memories/global/`, 'blue');
      log(`  📂 Project memories: memories/projects/migrated-data/`, 'blue');
      log('\nRestart your MCP clients to use the new system.', 'yellow');
    }

  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    log('Your original data is safe and unchanged.', 'yellow');
  }
}

async function showPreview() {
  const oldJsonPath = path.join(process.cwd(), 'memory.json');
  
  if (!fs.existsSync(oldJsonPath)) {
    log('No memory.json found', 'yellow');
    return;
  }

  try {
    const oldData = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8'));
    const entries = Object.entries(oldData);
    
    log(`📋 Preview of ${entries.length} memories to migrate:`, 'blue');
    
    entries.slice(0, 5).forEach(([key, memory]) => {
      const context = memory.context || {};
      const tags = [];
      if (Array.isArray(context.tags)) tags.push(...context.tags);
      if (context.category) tags.push(context.category);
      
      log(`\n  📝 ${key}`, 'green');
      log(`     Content: ${memory.value.slice(0, 60)}...`);
      log(`     Tags: ${tags.join(', ') || 'none'}`);
      log(`     Scope: ${context.scope || 'project'}`);
      log(`     Created: ${memory.timestamp}`);
    });

    if (entries.length > 5) {
      log(`\n  ... and ${entries.length - 5} more memories`, 'yellow');
    }

    log('\nRun "node migrate.js run" to start migration', 'blue');
    
  } catch (error) {
    log(`Error reading memory.json: ${error.message}`, 'red');
  }
}

// Main function
async function main() {
  const command = process.argv[2];

  log('\n🧠 Like-I-Said Memory Migration Tool\n', 'blue');

  switch (command) {
    case 'run':
      await migrateFromJson();
      break;
    case 'preview':
    default:
      await showPreview();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateFromJson, showPreview };