#!/usr/bin/env node

/**
 * Syntax validation test for TypeScript and React files
 * Catches syntax errors before pushing to GitHub
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Running syntax validation tests...\n');

let hasErrors = false;

// Test 1: TypeScript compilation check
console.log('1️⃣ Checking TypeScript syntax...');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { 
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ TypeScript syntax is valid\n');
} catch (error) {
  console.error('❌ TypeScript syntax errors found:');
  console.error(error.stdout?.toString() || error.stderr?.toString());
  hasErrors = true;
}

// Test 2: Build test (catches JSX/TSX syntax errors)
console.log('2️⃣ Running build test...');
try {
  execSync('npm run build', { 
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build errors found:');
  console.error(error.stdout?.toString() || error.stderr?.toString());
  hasErrors = true;
}

// Test 3: Check for common syntax patterns that cause issues
console.log('3️⃣ Checking for problematic syntax patterns...');
const problematicPatterns = [
  {
    // Only match incorrect syntax in our API helper calls (apiGet, apiPost, apiPut, apiDelete)
    pattern: /await\s+(apiGet|apiPost|apiPut|apiDelete)\s*\([^)]*,\s*body:/g,
    message: 'Found incorrect "body:" syntax in API helper calls'
  },
  {
    // Match incorrect parenthesis placement with body parameter
    pattern: /await\s+(apiGet|apiPost|apiPut|apiDelete)\s*\([^)]+\)\s*,\s*body:/g,
    message: 'Found incorrect API helper call with body parameter outside parentheses'
  }
];

const srcDir = path.join(__dirname, '..', 'src');
const checkFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  let fileHasErrors = false;
  
  problematicPatterns.forEach(({ pattern, message }) => {
    const matches = content.match(pattern);
    if (matches) {
      if (!fileHasErrors) {
        console.error(`\n❌ Issues in ${path.relative(process.cwd(), filePath)}:`);
        fileHasErrors = true;
      }
      console.error(`   - ${message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`);
      hasErrors = true;
    }
  });
};

const walkDir = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      checkFile(filePath);
    }
  });
};

walkDir(srcDir);

if (!hasErrors) {
  console.log('✅ No problematic syntax patterns found\n');
}

// Test 4: API connectivity test
console.log('4️⃣ Testing API configuration...');
try {
  const apiConfigPath = path.join(__dirname, '..', 'src', 'utils', 'apiConfig.ts');
  if (fs.existsSync(apiConfigPath)) {
    console.log('✅ API configuration file exists\n');
  } else {
    console.error('❌ API configuration file missing\n');
    hasErrors = true;
  }
} catch (error) {
  console.error('❌ Error checking API configuration:', error.message);
  hasErrors = true;
}

// Summary
console.log('━'.repeat(50));
if (hasErrors) {
  console.error('\n❌ Syntax validation FAILED - Fix errors before pushing\n');
  process.exit(1);
} else {
  console.log('\n✅ All syntax validation tests PASSED\n');
  process.exit(0);
}