#!/usr/bin/env node

/**
 * Comprehensive test suite for mock data detection patterns
 * Tests both false positives (legitimate content) and true positives (actual mock data)
 */

// Test patterns from the updated code
const mockDataPatterns = [
  /mock-\d+/i,
  /^test\s+data$/i,               // Only match exact "test data"
  /\btest\s+data\b/i,             // Match "test data" as whole words
  /sample.*content/i,
  /lorem ipsum/i,
  /fake.*data/i,
  /placeholder.*content/i,         // More specific placeholder pattern
  /dummy.*data/i                   // Add dummy data pattern
];

const taskMockPatterns = [
  /mock-\d+/i,
  /^test\s+task$/i,               // Only match exact "test task"
  /\btest\s+task\b/i,             // Match "test task" as whole words
  /sample.*task/i,
  /lorem ipsum/i,
  /fake.*task/i,
  /placeholder.*task/i,           // More specific placeholder pattern
  /dummy.*task/i,                 // Add dummy task pattern
  /todo.*test.*task/i             // More specific todo test pattern
];

// Helper function to test patterns
function testPattern(content, patterns, patternType = 'memory') {
  const matches = patterns.filter(pattern => pattern.test(content));
  return {
    content,
    matched: matches.length > 0,
    matchedPatterns: matches.map(p => p.toString()),
    patternType
  };
}

// Test cases for legitimate content that should NOT be rejected
const legitimateContentTests = [
  // Original failing content
  "WebSocket test endpoint: POST /test/emit with jobId, event, data",
  "Create larger test images (minimum 64x64 pixels)",
  "Test end-to-end workflow with proper image sizes",
  "ComfyUI requires minimum 3x3 kernel size - need proper test images",
  
  // Other legitimate test-related content
  "Running unit tests for the application",
  "Test suite completed successfully",
  "Integration test failed due to timeout",
  "Need to test the new API endpoint",
  "Testing environment setup complete",
  "Performance test results show improvement",
  "The test revealed interesting data about user behavior",
  "System test configuration updated",
  "Load test metrics collected",
  "Regression test passed all checks",
  
  // Edge cases with 'data' keyword
  "Database connection test successful",
  "Test the data migration script",
  "Quality test dataset prepared",
  "Test results stored in database",
  "Automated test pipeline configured",
  
  // Legitimate content with similar patterns
  "This is a real memory about testing procedures",
  "Document the test methodology used",
  "Test coverage report generated",
  "Unit test framework selection complete"
];

// Test cases for actual mock data that SHOULD be rejected
const mockDataTests = [
  // Exact matches
  "test data",
  "Test Data",
  "TEST DATA",
  " test data ",
  "This is test data for testing",
  
  // Mock patterns
  "mock-123",
  "mock-456789",
  "MOCK-999",
  
  // Lorem ipsum
  "Lorem ipsum dolor sit amet",
  "lorem ipsum testing content",
  
  // Fake data
  "fake data entry",
  "This is fake data",
  "Some fake test data here",
  
  // Sample content
  "sample content for testing",
  "This is sample content",
  
  // Placeholder
  "placeholder content here",
  "This is placeholder content for the form",
  
  // Dummy data
  "dummy data for testing",
  "Insert dummy data here"
];

// Task-specific test cases
const legitimateTaskTests = [
  "Test the authentication system",
  "Create test cases for user registration",
  "Debug test failures in CI pipeline",
  "Review test coverage metrics",
  "Implement automated testing framework"
];

const mockTaskTests = [
  "test task",
  "Test Task",
  "sample task for demo",
  "fake task entry",
  "placeholder task",
  "dummy task for testing",
  "todo test task for later"
];

// Run tests
console.log('=== Mock Data Detection Pattern Tests ===\n');

console.log('1. Testing LEGITIMATE content (should NOT be rejected):');
console.log('─'.repeat(60));
let falsePositives = 0;
legitimateContentTests.forEach(content => {
  const result = testPattern(content, mockDataPatterns);
  if (result.matched) {
    console.log(`❌ FALSE POSITIVE: "${content}"`);
    console.log(`   Matched by: ${result.matchedPatterns.join(', ')}`);
    falsePositives++;
  } else {
    console.log(`✅ PASS: "${content}"`);
  }
});

console.log(`\nLegitimate content false positive rate: ${falsePositives}/${legitimateContentTests.length} (${(falsePositives/legitimateContentTests.length*100).toFixed(1)}%)\n`);

console.log('2. Testing MOCK data (SHOULD be rejected):');
console.log('─'.repeat(60));
let falseNegatives = 0;
mockDataTests.forEach(content => {
  const result = testPattern(content, mockDataPatterns);
  if (!result.matched) {
    console.log(`❌ FALSE NEGATIVE: "${content}"`);
    falseNegatives++;
  } else {
    console.log(`✅ CAUGHT: "${content}"`);
    console.log(`   Matched by: ${result.matchedPatterns.join(', ')}`);
  }
});

console.log(`\nMock data detection rate: ${mockDataTests.length - falseNegatives}/${mockDataTests.length} (${((mockDataTests.length - falseNegatives)/mockDataTests.length*100).toFixed(1)}%)\n`);

console.log('3. Testing LEGITIMATE tasks (should NOT be rejected):');
console.log('─'.repeat(60));
let taskFalsePositives = 0;
legitimateTaskTests.forEach(content => {
  const result = testPattern(content, taskMockPatterns, 'task');
  if (result.matched) {
    console.log(`❌ FALSE POSITIVE: "${content}"`);
    console.log(`   Matched by: ${result.matchedPatterns.join(', ')}`);
    taskFalsePositives++;
  } else {
    console.log(`✅ PASS: "${content}"`);
  }
});

console.log(`\nLegitimate task false positive rate: ${taskFalsePositives}/${legitimateTaskTests.length} (${(taskFalsePositives/legitimateTaskTests.length*100).toFixed(1)}%)\n`);

console.log('4. Testing MOCK tasks (SHOULD be rejected):');
console.log('─'.repeat(60));
let taskFalseNegatives = 0;
mockTaskTests.forEach(content => {
  const result = testPattern(content, taskMockPatterns, 'task');
  if (!result.matched) {
    console.log(`❌ FALSE NEGATIVE: "${content}"`);
    taskFalseNegatives++;
  } else {
    console.log(`✅ CAUGHT: "${content}"`);
    console.log(`   Matched by: ${result.matchedPatterns.join(', ')}`);
  }
});

console.log(`\nMock task detection rate: ${mockTaskTests.length - taskFalseNegatives}/${mockTaskTests.length} (${((mockTaskTests.length - taskFalseNegatives)/mockTaskTests.length*100).toFixed(1)}%)\n`);

// Summary
console.log('=== SUMMARY ===');
console.log(`Total false positives: ${falsePositives + taskFalsePositives}`);
console.log(`Total false negatives: ${falseNegatives + taskFalseNegatives}`);
console.log(`Overall accuracy: ${((legitimateContentTests.length + mockDataTests.length + legitimateTaskTests.length + mockTaskTests.length - falsePositives - taskFalsePositives - falseNegatives - taskFalseNegatives) / (legitimateContentTests.length + mockDataTests.length + legitimateTaskTests.length + mockTaskTests.length) * 100).toFixed(1)}%`);

// Edge case testing
console.log('\n=== EDGE CASE TESTING ===');
const edgeCases = [
  { content: "test", expected: false, description: "Single word 'test'" },
  { content: "data", expected: false, description: "Single word 'data'" },
  { content: "testing data analysis", expected: false, description: "Words separated" },
  { content: "test  data", expected: true, description: "Double space between words" },
  { content: "\ttest data\t", expected: true, description: "Tabs around words" },
  { content: "contest database", expected: false, description: "Words within other words" },
  { content: "latest dataset", expected: false, description: "Similar but different words" },
  { content: "TEST DATA", expected: true, description: "Uppercase exact match" },
  { content: "mock-", expected: false, description: "Incomplete mock pattern" },
  { content: "mock-abc", expected: false, description: "Mock with non-digits" },
  { content: "placeholder", expected: false, description: "Placeholder without content" },
  { content: "fake", expected: false, description: "Fake without data" }
];

console.log('Testing edge cases:');
console.log('─'.repeat(60));
edgeCases.forEach(test => {
  const result = testPattern(test.content, mockDataPatterns);
  const passed = result.matched === test.expected;
  console.log(`${passed ? '✅' : '❌'} ${test.description}: "${test.content}"`);
  console.log(`   Expected: ${test.expected ? 'reject' : 'accept'}, Got: ${result.matched ? 'rejected' : 'accepted'}`);
  if (result.matched) {
    console.log(`   Matched by: ${result.matchedPatterns.join(', ')}`);
  }
});

// Test the old patterns to show the improvement
console.log('\n=== COMPARISON WITH OLD PATTERNS ===');
const oldPatterns = [
  /mock-\d+/i,
  /test.*data/i,      // Old problematic pattern
  /sample.*content/i,
  /lorem ipsum/i,
  /fake.*data/i,
  /placeholder/i
];

console.log('Testing problematic content with OLD patterns:');
console.log('─'.repeat(60));
const problematicContent = [
  "WebSocket test endpoint: POST /test/emit with jobId, event, data",
  "Create larger test images (minimum 64x64 pixels)",
  "Test end-to-end workflow with proper image sizes"
];

problematicContent.forEach(content => {
  const oldResult = testPattern(content, oldPatterns);
  const newResult = testPattern(content, mockDataPatterns);
  console.log(`Content: "${content}"`);
  console.log(`   OLD patterns: ${oldResult.matched ? '❌ REJECTED (false positive)' : '✅ ACCEPTED'}`);
  if (oldResult.matched) {
    console.log(`   Matched by: ${oldResult.matchedPatterns.join(', ')}`);
  }
  console.log(`   NEW patterns: ${newResult.matched ? '❌ REJECTED' : '✅ ACCEPTED (fixed!)'}`);
  console.log('');
});

process.exit(falsePositives + taskFalsePositives + falseNegatives + taskFalseNegatives);