#!/usr/bin/env node

/**
 * Simple MCP Server for testing
 */

process.stdin.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString().trim());
    
    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'test_tool',
              description: 'Test tool',
              inputSchema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                },
                required: ['message']
              }
            }
          ]
        }
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'tools/call') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [{
            type: 'text',
            text: `✅ Test successful! Message: ${request.params.arguments.message}`
          }]
        }
      };
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    };
    console.log(JSON.stringify(errorResponse));
  }
});