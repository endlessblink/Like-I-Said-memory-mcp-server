#!/usr/bin/env node

/**
 * Pre-push validation suite
 * Runs all critical tests before pushing to GitHub
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Running pre-push validation suite...\n');

const tests = [
  {
    name: 'Syntax Validation',
    command: 'npm run test:syntax',
    critical: true
  },
  {
    name: 'Build Test',
    command: 'npm run build',
    critical: true
  },
  {
    name: 'Unit Tests',
    command: 'npm test -- --passWithNoTests',
    critical: false
  }
];

let allPassed = true;
let criticalFailed = false;

tests.forEach(({ name, command, critical }) => {
  console.log(`\n📋 Running: ${name}`);
  console.log('━'.repeat(50));
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log(`✅ ${name} PASSED`);
  } catch (error) {
    console.error(`❌ ${name} FAILED`);
    allPassed = false;
    if (critical) {
      criticalFailed = true;
    }
  }
});

console.log('\n' + '═'.repeat(50));
console.log('SUMMARY:');
console.log('═'.repeat(50));

if (criticalFailed) {
  console.error('\n❌ CRITICAL TESTS FAILED - Cannot push to GitHub');
  console.error('   Fix the errors above before pushing\n');
  process.exit(1);
} else if (!allPassed) {
  console.warn('\n⚠️  Some non-critical tests failed');
  console.log('   You can push, but consider fixing these issues\n');
  process.exit(0);
} else {
  console.log('\n✅ All tests PASSED - Safe to push to GitHub\n');
  process.exit(0);
}