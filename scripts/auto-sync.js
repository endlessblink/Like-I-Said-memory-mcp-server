#!/usr/bin/env node
import { watch } from 'chokidar';
import { execSync } from 'child_process';
import path from 'path';

const SOURCE_DIR = process.cwd();
const TARGET_DIR = process.argv[2];

if (!TARGET_DIR) {
  console.error('Usage: node auto-sync.js <target-directory>');
  process.exit(1);
}

const watcher = watch('.', {
  ignored: [
    'node_modules/**',
    '.git/**',
    '*.log',
    'dist/**',
    '.DS_Store'
  ],
  persistent: true,
  ignoreInitial: true
});

console.log(`Syncing from ${SOURCE_DIR} to ${TARGET_DIR}`);

watcher
  .on('add', sync)
  .on('change', sync)
  .on('unlink', sync)
  .on('error', error => console.error('Watcher error:', error));

function sync(filePath) {
  try {
    console.log(`Syncing: ${filePath}`);
    execSync(`rsync -av --delete --exclude=node_modules --exclude=.git --exclude=dist . "${TARGET_DIR}/"`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}

// Initial sync
sync('initial');