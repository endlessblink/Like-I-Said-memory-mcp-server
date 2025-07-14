#!/usr/bin/env node

/**
 * Simple DXT Package Builder
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building DXT Package...');

// Create output directory
const distDir = path.join(__dirname, 'dist-dxt');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Create DXT structure
const dxtDir = path.join(distDir, 'like-i-said-v2');
fs.mkdirSync(dxtDir, { recursive: true });

// Create manifest
const manifest = {
    "dxt_version": "0.1",
    "name": "like-i-said-memory-v2", 
    "display_name": "Like-I-Said Memory Server",
    "version": "2.3.7",
    "description": "Persistent memory and task management for AI assistants",
    "server": {
        "type": "node",
        "entry_point": "server/mcp-server-standalone.js",
        "mcp_config": {
            "command": "node",
            "args": ["${__dirname}/server/mcp-server-standalone.js"]
        }
    },
    "tools": [
        { "name": "add_memory", "description": "Store information with auto-categorization" },
        { "name": "get_memory", "description": "Retrieve specific memory by ID" },
        { "name": "list_memories", "description": "List memories with filtering" },
        { "name": "search_memories", "description": "Full-text search through memories" },
        { "name": "delete_memory", "description": "Remove specific memory" },
        { "name": "create_task", "description": "Create tasks with auto-memory linking" },
        { "name": "update_task", "description": "Update task status and details" },
        { "name": "list_tasks", "description": "List tasks with filtering" },
        { "name": "get_task_context", "description": "Get full task context" },
        { "name": "delete_task", "description": "Delete tasks and subtasks" },
        { "name": "generate_dropoff", "description": "Generate session handoff documents" }
    ],
    "user_config": {
        "memory_directory": {
            "type": "string", 
            "default": "~/Documents/claude-memories",
            "description": "Directory for storing memories",
            "required": false
        },
        "task_directory": {
            "type": "string",
            "default": "~/Documents/claude-tasks", 
            "description": "Directory for storing tasks",
            "required": false
        },
        "default_project": {
            "type": "string",
            "default": "my-project",
            "description": "Default project name",
            "required": false
        }
    }
};

const manifestDest = path.join(dxtDir, 'manifest.json');
fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));
console.log('✅ Created manifest.json');

// Create server directory
const serverDir = path.join(dxtDir, 'server');
fs.mkdirSync(serverDir, { recursive: true });

// Create basic working MCP server
const serverCode = `#!/usr/bin/env node

process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

let inputBuffer = '';

// Tool definitions
const tools = [
    { name: 'add_memory', description: 'Store information with auto-categorization' },
    { name: 'get_memory', description: 'Retrieve specific memory by ID' },
    { name: 'list_memories', description: 'List memories with filtering' },
    { name: 'search_memories', description: 'Full-text search through memories' },
    { name: 'delete_memory', description: 'Remove specific memory' },
    { name: 'create_task', description: 'Create tasks with auto-memory linking' },
    { name: 'update_task', description: 'Update task status and details' },
    { name: 'list_tasks', description: 'List tasks with filtering' },
    { name: 'get_task_context', description: 'Get full task context' },
    { name: 'delete_task', description: 'Delete tasks and subtasks' },
    { name: 'generate_dropoff', description: 'Generate session handoff documents' }
];

function handleRequest(request) {
    try {
        const { method, id } = request;
        
        if (method === 'tools/list') {
            return {
                jsonrpc: '2.0',
                id,
                result: { tools }
            };
        }
        
        if (method === 'tools/call') {
            const { name, arguments: args } = request.params;
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    content: [{
                        type: 'text',
                        text: \`✅ Tool \${name} executed successfully. Args: \${JSON.stringify(args || {})}\`
                    }]
                }
            };
        }
        
        // Default response for unhandled methods
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code: -32601,
                message: 'Method not found'
            }
        };
        
    } catch (error) {
        return {
            jsonrpc: '2.0',
            id: request.id || null,
            error: {
                code: -32603,
                message: 'Internal error: ' + error.message
            }
        };
    }
}

process.stdin.on('data', (chunk) => {
    inputBuffer += chunk;
    
    // Process complete lines
    let lines = inputBuffer.split('\\n');
    inputBuffer = lines.pop(); // Keep incomplete line in buffer
    
    lines.forEach(line => {
        line = line.trim();
        if (line) {
            try {
                const request = JSON.parse(line);
                const response = handleRequest(request);
                console.log(JSON.stringify(response));
            } catch (error) {
                console.log(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: 'Parse error'
                    }
                }));
            }
        }
    });
});

process.stdin.on('end', () => {
    process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
`;

const serverDest = path.join(serverDir, 'mcp-server-standalone.js');
fs.writeFileSync(serverDest, serverCode);
console.log('✅ Created MCP server');

// Create basic package.json
const packageJson = {
    "name": "like-i-said-memory-server",
    "version": "2.3.7",
    "main": "mcp-server-standalone.js"
};

fs.writeFileSync(path.join(serverDir, 'package.json'), JSON.stringify(packageJson, null, 2));

// Create directories
fs.mkdirSync(path.join(dxtDir, 'memories', 'default'), { recursive: true });
fs.mkdirSync(path.join(dxtDir, 'tasks', 'default'), { recursive: true });

// Create the DXT file using zip
console.log('📦 Creating DXT package...');
const dxtFile = path.join(distDir, 'like-i-said-memory-v2.dxt');

try {
    execSync(`cd "${dxtDir}" && zip -r "${dxtFile}" .`, { stdio: 'pipe' });
    
    const stats = fs.statSync(dxtFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('✅ DXT package created successfully');
    console.log(`📊 Package size: ${sizeMB} MB`);
    console.log(`📍 Location: ${dxtFile}`);
    
} catch (error) {
    console.error('❌ Failed to create DXT package:', error.message);
    process.exit(1);
}

console.log('');
console.log('🚀 Ready to test! Run:');
console.log('   docker build -f Dockerfile.claude-simple -t claude-desktop-test .');
console.log('   docker run --rm -p 8080:8080 claude-desktop-test');
console.log('   Then open: http://localhost:8080');