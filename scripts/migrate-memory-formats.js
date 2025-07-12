#!/usr/bin/env node

import { MemoryFormat } from '../lib/memory-format.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const memoriesDir = path.join(__dirname, '..', 'memories');

console.log('🚀 Memory Format Migration Tool');
console.log('================================');
console.log(`📁 Scanning: ${memoriesDir}`);
console.log('');

// Run the migration
MemoryFormat.migrateAllMemories(memoriesDir).then(result => {
  console.log('\n✅ Migration completed successfully!');
  
  if (result.failed > 0) {
    console.log('\n⚠️  Some files failed to migrate. Please check the logs above.');
    process.exit(1);
  }
});