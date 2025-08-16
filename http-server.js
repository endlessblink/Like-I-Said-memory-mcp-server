#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const MemoryManager = require('./memory-manager.js');

const app = express();
const PORT = process.env.MCP_HTTP_PORT || 3002;

// Initialize memory manager
const memoryManager = new MemoryManager({
  baseDir: process.env.MEMORY_DIR || '/app/memories',
  project: process.env.PROJECT_NAME || 'default',
  sandboxed: process.env.SANDBOX_MODE !== 'false'
});

app.use(cors());
app.use(express.json());

// MCP HTTP API endpoints
app.post('/mcp/tools/list', async (req, res) => {
  try {
    const tools = [
      {
        name: 'add_memory',
        description: 'Store a memory with optional context, tags, and links',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "key": { "type": "string", "description": "Memory key" },
            "value": { "type": "string", "description": "Memory content" },
            "context": { 
              "type": "object", 
              "description": "Optional metadata",
              "properties": {
                "scope": { "type": "string", "enum": ["global", "project"] },
                "tags": { "type": "array", "items": { "type": "string" } },
                "links": { "type": "array", "items": { "type": "string" } },
                "title": { "type": "string" }
              },
              "additionalProperties": false
            }
          },
          "required": ["key", "value"],
          "additionalProperties": false
        }
      },
      {
        name: 'get_memory',
        description: 'Retrieve a memory by key',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "key": { "type": "string", "description": "Memory key" },
            "scope": { "type": "string", "enum": ["global", "project"] }
          },
          "required": ["key"],
          "additionalProperties": false
        }
      },
      {
        name: 'search_memories',
        description: 'Search memories by content, tags, or title',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Search query" },
            "scope": { "type": "string", "enum": ["global", "project", "all"] }
          },
          "required": ["query"],
          "additionalProperties": false
        }
      },
      {
        name: 'list_memories',
        description: 'List memory keys',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "prefix": { "type": "string" },
            "scope": { "type": "string", "enum": ["global", "project", "all"] }
          },
          "additionalProperties": false
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by key',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "key": { "type": "string", "description": "Memory key" },
            "scope": { "type": "string", "enum": ["global", "project"] }
          },
          "required": ["key"],
          "additionalProperties": false
        }
      },
      {
        name: 'get_memory_graph',
        description: 'Get memory graph for visualization',
        inputSchema: { 
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object", 
          "properties": {},
          "additionalProperties": false 
        }
      },
      {
        name: 'switch_project',
        description: 'Switch to different project context',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "project": { "type": "string", "description": "Project name" }
          },
          "required": ["project"],
          "additionalProperties": false
        }
      },
      {
        name: 'list_projects',
        description: 'List all available projects',
        inputSchema: { 
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object", 
          "properties": {},
          "additionalProperties": false 
        }
      }
    ];

    res.json({ tools });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/mcp/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    let result;
    switch (name) {
      case 'add_memory':
        result = await memoryManager.addMemory(args.key, args.value, args.context);
        res.json({
          content: [{
            type: 'text',
            text: `✓ Stored memory "${result.metadata.title}" in ${result.metadata.scope} scope`
          }]
        });
        break;

      case 'get_memory':
        result = await memoryManager.getMemory(args.key, args.scope);
        if (!result) {
          res.json({
            content: [{ type: 'text', text: `No memory found for key: ${args.key}` }]
          });
        } else {
          res.json({
            content: [{
              type: 'text',
              text: `# ${result.metadata.title}\n\n${result.content}\n\n**Scope**: ${result.metadata.scope}\n**Tags**: ${result.metadata.tags?.join(', ') || 'none'}`
            }]
          });
        }
        break;

      case 'search_memories':
        result = await memoryManager.searchMemories(args.query, args.scope);
        const searchText = result.length > 0 
          ? result.slice(0, 10).map(m => `**${m.metadata.title}** - ${m.content.slice(0, 100)}...`).join('\n\n')
          : `No memories found for "${args.query}"`;
        res.json({
          content: [{ type: 'text', text: searchText }]
        });
        break;

      case 'list_memories':
        result = await memoryManager.listMemories(args.prefix, args.scope);
        const listText = result.length > 0
          ? result.map(m => `- **${m.key}**: ${m.metadata.title} (${m.metadata.scope})`).join('\n')
          : 'No memories found';
        res.json({
          content: [{ type: 'text', text: listText }]
        });
        break;

      case 'delete_memory':
        result = await memoryManager.deleteMemory(args.key, args.scope);
        res.json({
          content: [{
            type: 'text',
            text: result ? `✓ Deleted memory: ${args.key}` : `No memory found: ${args.key}`
          }]
        });
        break;

      case 'get_memory_graph':
        result = await memoryManager.getMemoryGraph();
        res.json({
          content: [{
            type: 'text',
            text: `Memory Graph: ${result.nodes.length} nodes, ${result.edges.length} connections`
          }]
        });
        break;

      case 'switch_project':
        memoryManager.setProject(args.project);
        res.json({
          content: [{ type: 'text', text: `✓ Switched to project: ${args.project}` }]
        });
        break;

      case 'list_projects':
        result = memoryManager.listProjects();
        const projectText = result.length > 0
          ? result.map(p => `- ${p}${p === memoryManager.currentProject ? ' (current)' : ''}`).join('\n')
          : 'No projects found';
        res.json({
          content: [{ type: 'text', text: projectText }]
        });
        break;

      default:
        res.status(400).json({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    res.status(500).json({ 
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    project: memoryManager.currentProject,
    memoryDir: memoryManager.baseDir
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP HTTP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});

module.exports = app;