#!/usr/bin/env node

/**
 * Like-I-Said MCP Proxy Server
 * 
 * Lightweight stdio-to-HTTP proxy that forwards MCP requests to dashboard server.
 * This eliminates duplicate process issues by making multiple instances safe.
 * 
 * Architecture:
 * Claude Code → [This proxy via stdio] → Dashboard Server (HTTP) → Business Logic
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const DASHBOARD_PORT_FILE = '.dashboard-port';
const DEFAULT_DASHBOARD_PORT = 8776;
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Lightweight MCP Proxy Server
 */
class MCPProxyServer {
  constructor() {
    this.dashboardPort = this.findDashboardPort();
    this.dashboardUrl = `http://127.0.0.1:${this.dashboardPort}`;
    this.sessionId = this.generateSessionId();
    
    // HTTP client with timeout and retry config
    this.httpClient = axios.create({
      baseURL: this.dashboardUrl,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': this.sessionId,
        'X-MCP-Proxy': 'true'
      }
    });

    // Circuit breaker state
    this.circuitBreakerState = {
      failures: 0,
      lastFailure: null,
      isOpen: false
    };

    this.server = new Server(
      {
        name: 'like-i-said-memory-mcp-proxy',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Find dashboard server port from file or use default
   */
  findDashboardPort() {
    try {
      if (fs.existsSync(DASHBOARD_PORT_FILE)) {
        const port = parseInt(fs.readFileSync(DASHBOARD_PORT_FILE, 'utf8').trim());
        if (port && port > 0) {
          return port;
        }
      }
    } catch (error) {
      // Ignore errors, use default
    }
    return DEFAULT_DASHBOARD_PORT;
  }

  /**
   * Generate unique session ID for this proxy instance
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `proxy-${timestamp}-${random}`;
  }

  /**
   * Setup MCP request handlers
   */
  setupHandlers() {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        return await this.proxyRequest('GET', '/api/mcp-tools/list-tools', {});
      } catch (error) {
        console.error('[MCP-Proxy] Failed to list tools:', error.message);
        return { tools: [] };
      }
    });

    // Handle tool call requests  
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        return await this.proxyRequest('POST', `/api/mcp-tools/${encodeURIComponent(name)}`, args);
      } catch (error) {
        console.error(`[MCP-Proxy] Tool call failed for ${name}:`, error.message);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Tool call failed: ${error.message}`
            }
          ]
        };
      }
    });
  }

  /**
   * Proxy request to dashboard server with circuit breaker pattern
   */
  async proxyRequest(method, path, data) {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Dashboard server unavailable (circuit breaker open)');
    }

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.httpClient.request({
          method,
          url: path,
          data: method !== 'GET' ? data : undefined,
          params: method === 'GET' ? data : undefined
        });

        // Reset circuit breaker on success
        this.resetCircuitBreaker();
        
        return response.data;
        
      } catch (error) {
        lastError = error;
        
        // Record failure
        this.recordFailure();
        
        console.error(`[MCP-Proxy] Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if circuit breaker should be open
   */
  isCircuitBreakerOpen() {
    const now = Date.now();
    const timeSinceLastFailure = now - (this.circuitBreakerState.lastFailure || 0);
    
    // Open circuit if too many failures and not enough time passed
    if (this.circuitBreakerState.failures >= 5 && timeSinceLastFailure < 30000) {
      return true;
    }
    
    // Reset circuit breaker after timeout
    if (this.circuitBreakerState.failures >= 5 && timeSinceLastFailure >= 30000) {
      this.resetCircuitBreaker();
    }
    
    return false;
  }

  /**
   * Record a failure for circuit breaker
   */
  recordFailure() {
    this.circuitBreakerState.failures++;
    this.circuitBreakerState.lastFailure = Date.now();
  }

  /**
   * Reset circuit breaker state
   */
  resetCircuitBreaker() {
    this.circuitBreakerState.failures = 0;
    this.circuitBreakerState.lastFailure = null;
    this.circuitBreakerState.isOpen = false;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check - verify dashboard server is reachable
   */
  async healthCheck() {
    try {
      const response = await this.httpClient.get('/api/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the proxy server
   */
  async start() {
    try {
      // Health check before starting
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        console.error(`[MCP-Proxy] Dashboard server not reachable at ${this.dashboardUrl}`);
        console.error('[MCP-Proxy] Please ensure dashboard server is running:');
        console.error('[MCP-Proxy]   npm run start:dashboard');
        process.exit(1);
      }

      console.error(`[MCP-Proxy] Connected to dashboard server at ${this.dashboardUrl}`);
      console.error(`[MCP-Proxy] Session ID: ${this.sessionId}`);
      console.error('[MCP-Proxy] Proxy server ready for MCP connections');

      // Connect stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
    } catch (error) {
      console.error('[MCP-Proxy] Failed to start proxy server:', error);
      process.exit(1);
    }
  }
}

// Start proxy server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const proxy = new MCPProxyServer();
  proxy.start().catch(error => {
    console.error('[MCP-Proxy] Startup error:', error);
    process.exit(1);
  });
}

export { MCPProxyServer };