#!/usr/bin/env node

/**
 * Integration test for memory validation with mock detection
 * Tests the actual validation logic from server-markdown.js
 */

// Extract the validation logic from server-markdown.js
function validateMemoryContent(content, project = '', tags = []) {
  // Validation from server-markdown.js lines 1364-1390
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Invalid memory: Content is required and must be a non-empty string');
  }
  
  // Updated mock data patterns
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
  
  const containsMockPattern = mockDataPatterns.some(pattern => 
    pattern.test(content) || 
    (typeof project === 'string' && pattern.test(project)) ||
    (Array.isArray(tags) && tags.some(tag => pattern.test(tag)))
  );
  
  if (containsMockPattern) {
    throw new Error('Invalid memory: Mock data patterns detected. Only real memories are allowed.');
  }
  
  // Safeguard: Validate real content requirements
  if (content.trim().length < 10) {
    throw new Error('Invalid memory: Content must be at least 10 characters long for real memories');
  }
  
  return true;
}

// Test cases
const testCases = [
  // Your original failing content
  {
    content: `Palladio session continuation completed successfully. All services verified working:

**Services Status:**
- WebSocket server (port 5000) - healthy with Redis adapter
- ComfyUI monitor - running and connected to ComfyUI 
- Frontend (port 3002) - accessible with upload form
- ComfyUI (port 8181) - responding via host.docker.internal
- Redis (port 6379) - connected and operational
- n8n (port 6600) - running with webhook endpoint

**Key Issues Resolved:**
1. Added service management guidelines to CLAUDE.md to prevent duplicate services
2. Verified all existing services instead of creating new ones
3. Identified tensor dimension error root cause: test images too small (1x1, 2x2 pixels)
4. ComfyUI requires minimum 3x3 kernel size - need proper test images

**Next Steps for Complete Testing:**
- Create larger test images (minimum 64x64 pixels)
- Test end-to-end workflow with proper image sizes
- Verify real-time progress updates work correctly
- Test MCP memory creation integration

**Technical Details:**
- WebSocket test endpoint: POST /test/emit with jobId, event, data
- ComfyUI proxy working correctly on 8189 → 8181
- All fixed workflows available in comfyui/workflows/ directory`,
    project: 'Palladio',
    tags: ['session-recovery', 'services-verification', 'tensor-error-analysis'],
    shouldPass: true,
    description: 'Original Palladio memory content'
  },
  
  // Other real-world examples
  {
    content: 'Fixed authentication bug in production. The issue was related to JWT token expiration not being properly validated in the test environment.',
    project: 'Backend',
    tags: ['bug-fix', 'authentication', 'testing'],
    shouldPass: true,
    description: 'Bug fix documentation'
  },
  
  {
    content: 'Performance test results: API response time improved by 45% after implementing caching layer. Need to run more extensive load tests.',
    project: 'Performance',
    tags: ['optimization', 'testing', 'metrics'],
    shouldPass: true,
    description: 'Performance test results'
  },
  
  // Mock data that should fail
  {
    content: 'test data',
    project: 'Test',
    tags: [],
    shouldPass: false,
    description: 'Exact "test data"'
  },
  
  {
    content: 'This is just some fake data for testing purposes',
    project: 'Mock',
    tags: ['test'],
    shouldPass: false,
    description: 'Contains "fake data"'
  },
  
  {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    project: 'Design',
    tags: ['placeholder'],
    shouldPass: false,
    description: 'Lorem ipsum text'
  },
  
  // Edge cases
  {
    content: 'Too short',
    project: 'Test',
    tags: [],
    shouldPass: false,
    description: 'Content less than 10 characters'
  },
  
  {
    content: 'Testing the new feature implementation in production environment',
    project: 'test data',  // Project name is mock data
    tags: ['feature'],
    shouldPass: false,
    description: 'Project name contains mock pattern'
  },
  
  {
    content: 'Implementing new user authentication flow with OAuth2',
    project: 'Auth',
    tags: ['oauth', 'test data'],  // Tag contains mock pattern
    shouldPass: false,
    description: 'Tag contains mock pattern'
  }
];

// Run tests
console.log('=== Memory Validation Integration Tests ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`Content: "${testCase.content.substring(0, 50)}${testCase.content.length > 50 ? '...' : ''}"`);
  console.log(`Project: "${testCase.project}", Tags: [${testCase.tags.join(', ')}]`);
  
  try {
    validateMemoryContent(testCase.content, testCase.project, testCase.tags);
    
    if (testCase.shouldPass) {
      console.log('✅ PASSED: Memory validated successfully\n');
      passed++;
    } else {
      console.log('❌ FAILED: Expected rejection but memory was accepted\n');
      failed++;
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log(`✅ PASSED: Correctly rejected with error: ${error.message}\n`);
      passed++;
    } else {
      console.log(`❌ FAILED: Unexpected rejection: ${error.message}\n`);
      failed++;
    }
  }
});

console.log('=== Summary ===');
console.log(`Total tests: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success rate: ${(passed / testCases.length * 100).toFixed(1)}%`);

// Test with old patterns to show the difference
console.log('\n=== Comparison with Old Patterns ===');

function validateWithOldPatterns(content, project = '', tags = []) {
  // Old patterns that caused false positives
  const oldMockDataPatterns = [
    /mock-\d+/i,
    /test.*data/i,      // This was the problematic pattern
    /sample.*content/i,
    /lorem ipsum/i,
    /fake.*data/i,
    /placeholder/i
  ];
  
  const containsMockPattern = oldMockDataPatterns.some(pattern => 
    pattern.test(content) || 
    (typeof project === 'string' && pattern.test(project)) ||
    (Array.isArray(tags) && tags.some(tag => pattern.test(tag)))
  );
  
  return !containsMockPattern;
}

const problematicCase = testCases[0]; // Your original Palladio content
console.log('Testing your original Palladio content:');
console.log('─'.repeat(60));

const oldResult = validateWithOldPatterns(problematicCase.content, problematicCase.project, problematicCase.tags);
const newResult = (() => {
  try {
    validateMemoryContent(problematicCase.content, problematicCase.project, problematicCase.tags);
    return true;
  } catch {
    return false;
  }
})();

console.log(`Old patterns result: ${oldResult ? '❌ REJECTED (false positive)' : '✅ ACCEPTED'}`);
console.log(`New patterns result: ${newResult ? '✅ ACCEPTED (fixed!)' : '❌ REJECTED'}`);

process.exit(failed > 0 ? 1 : 0);