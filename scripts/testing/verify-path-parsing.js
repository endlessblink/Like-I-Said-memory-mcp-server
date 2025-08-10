#!/usr/bin/env node

import path from 'path';

// Test the getInstallPath logic
function getInstallPath(args) {
  const pathIndex = args.indexOf('--path');
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    const customPath = args[pathIndex + 1];
    return path.resolve(customPath);
  }
  return process.cwd();
}

// Test cases
const testCases = [
  {
    name: 'No --path argument',
    args: ['node', 'cli.js', 'install'],
    expected: process.cwd()
  },
  {
    name: 'With relative path',
    args: ['node', 'cli.js', 'install', '--path', './test-dir'],
    expected: path.resolve('./test-dir')
  },
  {
    name: 'With absolute path',
    args: ['node', 'cli.js', 'install', '--path', '/opt/mcp/like-i-said'],
    expected: '/opt/mcp/like-i-said'
  },
  {
    name: 'With Windows path',
    args: ['node', 'cli.js', 'install', '--path', 'C:\\tools\\mcp-servers'],
    expected: path.resolve('C:\\tools\\mcp-servers')
  },
  {
    name: 'Path with spaces',
    args: ['node', 'cli.js', 'install', '--path', '/opt/mcp servers/like-i-said'],
    expected: '/opt/mcp servers/like-i-said'
  },
  {
    name: 'With other flags',
    args: ['node', 'cli.js', 'install', '--debug', '--path', '../shared/mcp', '--docker'],
    expected: path.resolve('../shared/mcp')
  }
];

console.log('🧪 Testing Path Parsing Logic\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = getInstallPath(test.args);
  const success = result === test.expected;
  
  console.log(`Test: ${test.name}`);
  console.log(`  Args: ${test.args.slice(2).join(' ')}`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Got: ${result}`);
  console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (success) passed++;
  else failed++;
}

console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All path parsing tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}