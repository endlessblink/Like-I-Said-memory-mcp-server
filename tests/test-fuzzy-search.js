#!/usr/bin/env node

/**
 * Test script for fuzzy search functionality
 */

import { FuzzyMatcher } from './lib/fuzzy-matching.js';

console.log('🧪 Testing Fuzzy Search Functionality\n');

const matcher = new FuzzyMatcher();

// Test data - simulating memories
const testMemories = [
  {
    id: '1',
    content: 'Fixed the authentication bug by updating the JWT token validation logic',
    title: 'Auth Bug Fix',
    tags: ['bug', 'authentication', 'jwt']
  },
  {
    id: '2',
    content: 'Implemented fuzzy search using Fuse.js for better search experience',
    title: 'Fuzzy Search Implementation',
    tags: ['feature', 'search', 'fuzzy']
  },
  {
    id: '3',
    content: 'Configured PostgreSQL database connection with proper SSL certificates',
    title: 'Database Setup',
    tags: ['configuration', 'postgresql', 'database']
  },
  {
    id: '4',
    content: 'Created a universal work detector that automatically captures important patterns',
    title: 'Work Detector',
    tags: ['automation', 'detection', 'patterns']
  },
  {
    id: '5',
    content: 'Resolved CORS issues by configuring proper headers in Express middleware',
    title: 'CORS Configuration',
    tags: ['cors', 'express', 'middleware']
  }
];

// Test cases
const testCases = [
  {
    query: 'fuzzy serch',  // Typo in "search"
    expectedMatch: '2',
    description: 'Typo tolerance test'
  },
  {
    query: 'authentication token',
    expectedMatch: '1',
    description: 'Multi-word search'
  },
  {
    query: 'databse',  // Typo in "database"
    expectedMatch: '3',
    description: 'Typo in technical term'
  },
  {
    query: 'CORS express',
    expectedMatch: '5',
    description: 'Case insensitive search'
  },
  {
    query: 'pattern detection',
    expectedMatch: '4',
    description: 'Partial match across content'
  }
];

console.log('📚 Test Memories:');
testMemories.forEach(m => {
  console.log(`  ${m.id}: ${m.title}`);
});
console.log('');

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`  Query: "${test.query}"`);
  
  const results = matcher.searchMemories(testMemories, test.query);
  
  if (results.length > 0) {
    const topMatch = results[0];
    console.log(`  Top match: ID ${topMatch.id} - "${topMatch.title}"`);
    console.log(`  Score: ${(topMatch.fuzzyScore * 100).toFixed(1)}% match`);
    
    if (topMatch.id === test.expectedMatch) {
      console.log('  ✅ PASSED - Correct match found');
      passed++;
    } else {
      console.log(`  ❌ FAILED - Expected ID ${test.expectedMatch}`);
      failed++;
    }
  } else {
    console.log('  ❌ FAILED - No matches found');
    failed++;
  }
  console.log('');
});

// Advanced feature tests
console.log('🔬 Advanced Feature Tests:\n');

// Test relevance ranking
console.log('Test: Relevance Ranking');
const relevanceResults = matcher.searchMemories(testMemories, 'bug fix');
console.log('  Query: "bug fix"');
console.log('  Results (ordered by relevance):');
relevanceResults.slice(0, 3).forEach((result, i) => {
  console.log(`    ${i + 1}. ${result.title} (${(result.fuzzyScore * 100).toFixed(1)}% match)`);
});

// Test multi-mode search
console.log('\nTest: Multi-Mode Search');
const multiModeQuery = 'authentication';
const multiModeResults = matcher.multiModeSearch(testMemories, multiModeQuery);
if (multiModeResults.length > 0) {
  console.log(`  Query: "${multiModeQuery}"`);
  console.log(`  Top result: ${multiModeResults[0].title} (Mode: ${multiModeResults[0].searchMode})`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary:');
console.log(`  ✅ Passed: ${passed}/${testCases.length}`);
console.log(`  ❌ Failed: ${failed}/${testCases.length}`);
console.log(`  Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Fuzzy search is working correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Review the implementation.');
}

process.exit(failed === 0 ? 0 : 1);