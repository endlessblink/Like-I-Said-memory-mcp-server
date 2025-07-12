#!/usr/bin/env node

/**
 * Minimal MCP test server - verifies basic protocol works
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Create minimal server
const server = new Server(
  {
    name: 'minimal-test',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add one simple tool
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'Simple test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Test message',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'test_tool') {
    return {
      content: [
        {
          type: 'text',
          text: `Test successful! Message: ${request.params.arguments?.message || 'none'}`,
        },
      ],
    };
  }
  
  return {
    content: [
      {
        type: 'text',
        text: 'Tool not found',
      },
    ],
    isError: true,
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // NO console output at all!
}

main().catch((error) => {
  // Even errors go to stderr
  process.stderr.write('Server error: ' + error.message + '\n');
  process.exit(1);
});