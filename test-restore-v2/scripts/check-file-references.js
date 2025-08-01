#!/usr/bin/env node

/**
 * File Reference Checker
 * 
 * This script checks for references to a file before it's moved or renamed.
 * It helps prevent broken references in the codebase.
 * 
 * Usage:
 *   node scripts/check-file-references.js <filename>
 *   node scripts/check-file-references.js memory-quality-standards.md
 *   node scripts/check-file-references.js --all-docs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Directories to exclude from search
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'data-backups',
  'memories',
  'tasks'
];

// File extensions to search in
const SEARCH_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.sh',
  '.bat',
  '.cmd'
];

/**
 * Search for references to a filename in the codebase
 */
function findReferences(filename) {
  console.log(`\n${colors.blue}Searching for references to: ${colors.yellow}${filename}${colors.reset}\n`);
  
  try {
    // Build exclude pattern for grep
    const excludePattern = EXCLUDE_DIRS.map(dir => `--exclude-dir=${dir}`).join(' ');
    
    // Escape special characters in filename for regex
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Use grep to find references
    const command = `grep -rn "${escapedFilename}" . ${excludePattern} --include="*.*" 2>/dev/null || true`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    
    if (!output.trim()) {
      console.log(`${colors.green}✓ No references found. Safe to move!${colors.reset}\n`);
      return [];
    }
    
    // Parse grep output
    const references = output.trim().split('\n').map(line => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2], 10),
          content: match[3].trim()
        };
      }
      return null;
    }).filter(Boolean);
    
    // Group by file
    const groupedRefs = {};
    references.forEach(ref => {
      if (!groupedRefs[ref.file]) {
        groupedRefs[ref.file] = [];
      }
      groupedRefs[ref.file].push(ref);
    });
    
    // Display results
    console.log(`${colors.red}⚠ Found ${references.length} reference(s) in ${Object.keys(groupedRefs).length} file(s):${colors.reset}\n`);
    
    Object.entries(groupedRefs).forEach(([file, refs]) => {
      console.log(`${colors.yellow}${file}:${colors.reset}`);
      refs.forEach(ref => {
        console.log(`  ${colors.blue}Line ${ref.line}:${colors.reset} ${ref.content}`);
      });
      console.log();
    });
    
    return references;
    
  } catch (error) {
    console.error(`${colors.red}Error searching for references:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * Check all documentation files
 */
function checkAllDocs() {
  console.log(`\n${colors.blue}Checking all documentation files...${colors.reset}\n`);
  
  const docsToCheck = [];
  
  // Find all .md files
  function findMdFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !EXCLUDE_DIRS.includes(file)) {
          findMdFiles(fullPath);
        } else if (file.endsWith('.md')) {
          docsToCheck.push(file);
        }
      });
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  findMdFiles('.');
  
  // Check each doc file
  const filesWithRefs = [];
  docsToCheck.forEach(doc => {
    const refs = findReferences(doc);
    if (refs.length > 0) {
      filesWithRefs.push({ file: doc, references: refs });
    }
  });
  
  // Summary
  console.log(`\n${colors.blue}=== SUMMARY ===${colors.reset}`);
  console.log(`Total documentation files checked: ${docsToCheck.length}`);
  console.log(`Files with references: ${filesWithRefs.length}`);
  
  if (filesWithRefs.length > 0) {
    console.log(`\n${colors.yellow}Files that need attention before moving:${colors.reset}`);
    filesWithRefs.forEach(({ file, references }) => {
      console.log(`  - ${file} (${references.length} references)`);
    });
  }
}

/**
 * Generate a move plan for a file
 */
function generateMovePlan(filename, newPath) {
  const refs = findReferences(filename);
  
  if (refs.length === 0) {
    console.log(`\n${colors.green}No updates needed. You can safely move the file.${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.blue}=== MOVE PLAN ===${colors.reset}`);
  console.log(`Moving: ${filename} → ${newPath}\n`);
  
  console.log(`${colors.yellow}Files that need updating:${colors.reset}`);
  const uniqueFiles = [...new Set(refs.map(r => r.file))];
  uniqueFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log(`\n${colors.yellow}Suggested workflow:${colors.reset}`);
  console.log('1. Update all references in the files listed above');
  console.log('2. Test that the application still works');
  console.log('3. Move the file to its new location');
  console.log('4. Run tests again to confirm everything works');
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${colors.blue}File Reference Checker${colors.reset}

Usage:
  node scripts/check-file-references.js <filename>
  node scripts/check-file-references.js <filename> <new-path>
  node scripts/check-file-references.js --all-docs

Examples:
  node scripts/check-file-references.js memory-quality-standards.md
  node scripts/check-file-references.js config.json src/config.json
  node scripts/check-file-references.js --all-docs
    `);
    process.exit(0);
  }
  
  if (args[0] === '--all-docs') {
    checkAllDocs();
  } else if (args.length === 2) {
    generateMovePlan(args[0], args[1]);
  } else {
    findReferences(args[0]);
  }
}

// Run the script
main();