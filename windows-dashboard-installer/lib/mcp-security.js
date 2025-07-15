#!/usr/bin/env node

import { z } from 'zod';

/**
 * MCP Security Layer
 * Validates and sanitizes MCP requests to prevent injection attacks
 */
export class McpSecurity {
  // Whitelist of allowed MCP tool names
  static ALLOWED_TOOLS = [
    'add_memory',
    'get_memory', 
    'list_memories',
    'delete_memory',
    'search_memories',
    'test_tool',
    'create_task',
    'update_task',
    'list_tasks',
    'get_task_context',
    'delete_task',
    'generate_dropoff',
    'validate_task_workflow'
  ];

  // Maximum input size (1MB)
  static MAX_INPUT_SIZE = 1024 * 1024;

  // MCP Request Schema
  static mcpRequestSchema = z.object({
    jsonrpc: z.string().regex(/^2\.0$/),
    id: z.number().int().positive(),
    method: z.string().regex(/^tools\/call$/),
    params: z.object({
      name: z.string().min(1).max(100),
      arguments: z.record(z.any()).optional()
    })
  });

  /**
   * Validate tool name against whitelist
   */
  static validateToolName(toolName) {
    if (!toolName || typeof toolName !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (toolName.length > 100) {
      throw new Error('Tool name too long (max 100 characters)');
    }

    // Check against whitelist
    if (!this.ALLOWED_TOOLS.includes(toolName)) {
      throw new Error(`Tool '${toolName}' is not allowed. Allowed tools: ${this.ALLOWED_TOOLS.join(', ')}`);
    }

    return toolName;
  }

  /**
   * Sanitize and validate tool arguments
   */
  static validateToolArgs(toolArgs) {
    if (!toolArgs) {
      return {};
    }

    if (typeof toolArgs !== 'object' || Array.isArray(toolArgs)) {
      throw new Error('Tool arguments must be an object');
    }

    // Convert to JSON and check size
    const jsonStr = JSON.stringify(toolArgs);
    if (jsonStr.length > this.MAX_INPUT_SIZE) {
      throw new Error(`Tool arguments too large (max ${this.MAX_INPUT_SIZE} bytes)`);
    }

    // Sanitize string values to prevent injection
    const sanitized = this.sanitizeObject(toolArgs);
    return sanitized;
  }

  /**
   * Recursively sanitize object values
   */
  static sanitizeObject(obj, depth = 0) {
    if (depth > 10) {
      throw new Error('Object nesting too deep (max 10 levels)');
    }

    if (obj === null || typeof obj !== 'object') {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys
      const cleanKey = this.sanitizeKey(key);
      sanitized[cleanKey] = this.sanitizeObject(value, depth + 1);
    }

    return sanitized;
  }

  /**
   * Sanitize object keys
   */
  static sanitizeKey(key) {
    if (typeof key !== 'string') {
      throw new Error('Object keys must be strings');
    }

    if (key.length > 100) {
      throw new Error('Object key too long (max 100 characters)');
    }

    // Remove potentially dangerous characters
    return key.replace(/[<>'"&]/g, '');
  }

  /**
   * Sanitize individual values
   */
  static sanitizeValue(value) {
    if (typeof value === 'string') {
      // Prevent script injection and limit length
      if (value.length > 10000) {
        throw new Error('String value too long (max 10000 characters)');
      }
      
      // Remove potentially dangerous patterns
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/onload=/gi, '')
        .replace(/onerror=/gi, '');
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('Number must be finite');
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === null || value === undefined) {
      return value;
    }

    throw new Error(`Unsupported value type: ${typeof value}`);
  }

  /**
   * Create secure MCP request
   */
  static createMcpRequest(toolName, toolArgs) {
    // Validate inputs
    const validatedToolName = this.validateToolName(toolName);
    const validatedToolArgs = this.validateToolArgs(toolArgs);

    // Create request object
    const mcpRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: validatedToolName,
        arguments: validatedToolArgs
      }
    };

    // Validate against schema
    const result = this.mcpRequestSchema.safeParse(mcpRequest);
    if (!result.success) {
      throw new Error(`Invalid MCP request: ${result.error.message}`);
    }

    return mcpRequest;
  }

  /**
   * Validate JSON string before sending to MCP server
   */
  static validateJsonInput(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    if (jsonString.length > this.MAX_INPUT_SIZE) {
      throw new Error(`Input too large (max ${this.MAX_INPUT_SIZE} bytes)`);
    }

    try {
      const parsed = JSON.parse(jsonString);
      const result = this.mcpRequestSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Invalid JSON structure: ${result.error.message}`);
      }
      return jsonString;
    } catch (error) {
      if (error.message.includes('Invalid JSON structure')) {
        throw error;
      }
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Rate limiting helper (simple in-memory implementation)
   */
  static rateLimitMap = new Map();

  static checkRateLimit(clientId, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [id, requests] of this.rateLimitMap.entries()) {
      const filtered = requests.filter(time => time > windowStart);
      if (filtered.length === 0) {
        this.rateLimitMap.delete(id);
      } else {
        this.rateLimitMap.set(id, filtered);
      }
    }

    // Check current client
    const requests = this.rateLimitMap.get(clientId) || [];
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      throw new Error(`Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds`);
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitMap.set(clientId, recentRequests);
  }
}