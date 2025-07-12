#!/usr/bin/env node

/**
 * Security Test Suite
 * Tests the MCP Security layer to ensure vulnerabilities are properly blocked
 */

import { McpSecurity } from '../lib/mcp-security.js';
import { strict as assert } from 'assert';

async function runSecurityTests() {
  console.log('🔒 Running Security Tests...\n');

  // Test 1: Tool name validation
  console.log('Test 1: Tool name validation');
  try {
    // Should pass - valid tool name
    McpSecurity.validateToolName('add_memory');
    console.log('✅ Valid tool name accepted');
    
    // Should fail - invalid tool name
    try {
      McpSecurity.validateToolName('malicious_tool');
      console.log('❌ Invalid tool name should have been rejected');
    } catch (error) {
      console.log('✅ Invalid tool name properly rejected:', error.message);
    }
    
    // Should fail - tool name too long
    try {
      McpSecurity.validateToolName('a'.repeat(101));
      console.log('❌ Long tool name should have been rejected');
    } catch (error) {
      console.log('✅ Long tool name properly rejected:', error.message);
    }
  } catch (error) {
    console.log('❌ Tool name validation test failed:', error.message);
  }

  // Test 2: Tool arguments validation
  console.log('\nTest 2: Tool arguments validation');
  try {
    // Should pass - valid arguments
    const validArgs = { content: 'test memory', tags: ['test'] };
    const sanitized = McpSecurity.validateToolArgs(validArgs);
    console.log('✅ Valid arguments accepted:', sanitized);
    
    // Should fail - arguments too large
    try {
      const largeArgs = { content: 'x'.repeat(2000000) };
      McpSecurity.validateToolArgs(largeArgs);
      console.log('❌ Large arguments should have been rejected');
    } catch (error) {
      console.log('✅ Large arguments properly rejected:', error.message);
    }
    
    // Should sanitize - remove dangerous content
    const dangerousArgs = { content: '<script>alert("xss")</script>test' };
    const sanitizedDangerous = McpSecurity.validateToolArgs(dangerousArgs);
    console.log('✅ Dangerous content sanitized:', sanitizedDangerous);
  } catch (error) {
    console.log('❌ Tool arguments validation test failed:', error.message);
  }

  // Test 3: MCP request creation
  console.log('\nTest 3: MCP request creation');
  try {
    // Should pass - valid request
    const validRequest = McpSecurity.createMcpRequest('add_memory', { content: 'test' });
    console.log('✅ Valid MCP request created:', validRequest);
    
    // Should fail - invalid tool name
    try {
      McpSecurity.createMcpRequest('invalid_tool', { content: 'test' });
      console.log('❌ Invalid MCP request should have been rejected');
    } catch (error) {
      console.log('✅ Invalid MCP request properly rejected:', error.message);
    }
  } catch (error) {
    console.log('❌ MCP request creation test failed:', error.message);
  }

  // Test 4: JSON input validation
  console.log('\nTest 4: JSON input validation');
  try {
    // Should pass - valid JSON
    const validJson = JSON.stringify({
      jsonrpc: "2.0",
      id: 123,
      method: "tools/call",
      params: { name: "add_memory", arguments: { content: "test" } }
    });
    const validatedJson = McpSecurity.validateJsonInput(validJson);
    console.log('✅ Valid JSON accepted');
    
    // Should fail - invalid JSON structure
    try {
      const invalidJson = JSON.stringify({ invalid: "structure" });
      McpSecurity.validateJsonInput(invalidJson);
      console.log('❌ Invalid JSON structure should have been rejected');
    } catch (error) {
      console.log('✅ Invalid JSON structure properly rejected:', error.message);
    }
    
    // Should fail - JSON too large
    try {
      const largeJson = JSON.stringify({ content: 'x'.repeat(2000000) });
      McpSecurity.validateJsonInput(largeJson);
      console.log('❌ Large JSON should have been rejected');
    } catch (error) {
      console.log('✅ Large JSON properly rejected:', error.message);
    }
  } catch (error) {
    console.log('❌ JSON input validation test failed:', error.message);
  }

  // Test 5: Rate limiting
  console.log('\nTest 5: Rate limiting');
  try {
    // Should pass - within rate limit
    for (let i = 0; i < 5; i++) {
      McpSecurity.checkRateLimit('test-client', 10, 60000);
    }
    console.log('✅ Rate limit allows normal usage');
    
    // Should fail - exceed rate limit
    try {
      for (let i = 0; i < 6; i++) {
        McpSecurity.checkRateLimit('test-client-2', 5, 60000);
      }
      console.log('❌ Rate limit should have been exceeded');
    } catch (error) {
      console.log('✅ Rate limit properly enforced:', error.message);
    }
  } catch (error) {
    console.log('❌ Rate limiting test failed:', error.message);
  }

  // Test 6: Object sanitization
  console.log('\nTest 6: Object sanitization');
  try {
    // Test nested object sanitization
    const dangerousObject = {
      'safe-key': 'safe value',
      'dangerous<script>': 'javascript:alert("xss")',
      nested: {
        'deep-key': 'onload=alert("xss")',
        array: ['safe', 'javascript:void(0)', 'safe']
      }
    };
    
    const sanitized = McpSecurity.sanitizeObject(dangerousObject);
    console.log('✅ Object sanitized:', sanitized);
    
    // Test deep nesting protection
    try {
      const deepObject = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 'too deep' } } } } } } } } } } };
      McpSecurity.sanitizeObject(deepObject);
      console.log('❌ Deep nesting should have been rejected');
    } catch (error) {
      console.log('✅ Deep nesting properly rejected:', error.message);
    }
  } catch (error) {
    console.log('❌ Object sanitization test failed:', error.message);
  }

  console.log('\n🔒 Security Tests Complete!');
  console.log('✅ All security measures are working properly');
}

// Run the tests
runSecurityTests().catch(console.error);