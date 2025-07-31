#!/usr/bin/env node

/**
 * Test the specific content that was failing in the original bug report
 */

// The exact patterns from our updated code
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

// The OLD problematic patterns
const oldMockDataPatterns = [
  /mock-\d+/i,
  /test.*data/i,      // This was causing the false positive
  /sample.*content/i,
  /lorem ipsum/i,
  /fake.*data/i,
  /placeholder/i
];

function testPatterns(content, patterns, patternName) {
  const matches = patterns.filter(pattern => pattern.test(content));
  return {
    matched: matches.length > 0,
    matchedPatterns: matches,
    patternName
  };
}

// The exact content from the original bug report
const originalFailingContent = `Palladio session continuation completed successfully. All services verified working:

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
- All fixed workflows available in comfyui/workflows/ directory`;

console.log('=== SPECIFIC FAILURE CASE TEST ===\n');
console.log('Testing the exact content that was originally failing...\n');

// Test with old patterns
console.log('1. Testing with OLD patterns (that caused the bug):');
console.log('─'.repeat(60));
const oldResult = testPatterns(originalFailingContent, oldMockDataPatterns, 'OLD');
console.log(`Result: ${oldResult.matched ? '❌ REJECTED (FALSE POSITIVE - this was the bug!)' : '✅ ACCEPTED'}`);
if (oldResult.matched) {
  console.log(`Matched by: ${oldResult.matchedPatterns.map(p => p.toString()).join(', ')}`);
  
  // Show exactly what triggered the match
  oldResult.matchedPatterns.forEach(pattern => {
    const match = originalFailingContent.match(pattern);
    if (match) {
      console.log(`Pattern ${pattern} matched: "${match[0]}"`);
      // Show context around the match
      const index = originalFailingContent.indexOf(match[0]);
      const start = Math.max(0, index - 20);
      const end = Math.min(originalFailingContent.length, index + match[0].length + 20);
      const context = originalFailingContent.substring(start, end);
      console.log(`Context: "...${context}..."`);
    }
  });
}

console.log('\n2. Testing with NEW patterns (fixed):');
console.log('─'.repeat(60));
const newResult = testPatterns(originalFailingContent, mockDataPatterns, 'NEW');
console.log(`Result: ${newResult.matched ? '❌ REJECTED' : '✅ ACCEPTED (BUG FIXED!)'}`);
if (newResult.matched) {
  console.log(`Matched by: ${newResult.matchedPatterns.map(p => p.toString()).join(', ')}`);
}

console.log('\n=== DETAILED ANALYSIS ===');
console.log('Problematic phrases in the content:');
const problematicPhrases = [
  'test endpoint',
  'test images',
  'test end-to-end',
  'test MCP memory'
];

problematicPhrases.forEach(phrase => {
  const oldMatch = /test.*data/i.test(phrase);
  const newMatch = mockDataPatterns.some(p => p.test(phrase));
  console.log(`"${phrase}": OLD=${oldMatch ? 'MATCH' : 'no match'}, NEW=${newMatch ? 'MATCH' : 'no match'}`);
});

console.log('\n=== SPECIFIC PATTERN ANALYSIS ===');
console.log('The problematic line: "WebSocket test endpoint: POST /test/emit with jobId, event, data"');
console.log('');

const problematicLine = "WebSocket test endpoint: POST /test/emit with jobId, event, data";
console.log(`Old pattern /test.*data/i test: ${/test.*data/i.test(problematicLine) ? 'MATCHES (caused bug)' : 'no match'}`);
console.log(`New pattern /^test\\s+data$/i test: ${/^test\s+data$/i.test(problematicLine) ? 'MATCHES' : 'no match'}`);
console.log(`New pattern /\\btest\\s+data\\b/i test: ${/\btest\s+data\b/i.test(problematicLine) ? 'MATCHES' : 'no match'}`);

console.log('\n=== CONCLUSION ===');
if (oldResult.matched && !newResult.matched) {
  console.log('✅ SUCCESS: Bug has been fixed!');
  console.log('   - OLD patterns incorrectly rejected legitimate content');
  console.log('   - NEW patterns correctly accept the same content');
  process.exit(0);
} else if (!oldResult.matched && !newResult.matched) {
  console.log('ℹ️  INFO: Content was never rejected by either pattern set');
  console.log('   - This might indicate the issue was elsewhere in the validation chain');
  process.exit(1);
} else if (newResult.matched) {
  console.log('❌ PROBLEM: New patterns still reject the content');
  console.log('   - The fix may not be complete');
  process.exit(1);
} else {
  console.log('❓ UNEXPECTED: Old patterns accepted but we expected them to reject');
  process.exit(1);
}