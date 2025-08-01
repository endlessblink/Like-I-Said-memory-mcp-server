// Test that V3 tools are properly integrated into the MCP server
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing V3 MCP Tools Integration\n');

// Simulate MCP client request to list tools
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

// Start the MCP server
const serverPath = path.join(__dirname, '../../server-markdown.js');
const mcpServer = spawn('node', [serverPath], {
  env: { ...process.env, MCP_MODE: 'true' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';
let errorBuffer = '';

mcpServer.stdout.on('data', (data) => {
  outputBuffer += data.toString();
  
  // Check if we've received the complete response
  if (outputBuffer.includes('"jsonrpc"')) {
    try {
      const response = JSON.parse(outputBuffer.trim());
      
      if (response.result && response.result.tools) {
        console.log('✅ MCP Server responded with tools list');
        console.log(`Total tools: ${response.result.tools.length}`);
        
        // Check for V3 tools
        const v3Tools = response.result.tools.filter(tool => 
          ['create_project', 'create_stage', 'create_hierarchical_task', 
           'create_subtask', 'move_task', 'view_project'].includes(tool.name)
        );
        
        console.log(`\n✅ Found ${v3Tools.length} V3 tools:`);
        v3Tools.forEach(tool => {
          console.log(`   - ${tool.name}`);
        });
        
        if (v3Tools.length === 6) {
          console.log('\n🎉 All V3 tools are properly integrated!');
        } else {
          console.log('\n⚠️  Some V3 tools are missing');
        }
      }
      
      mcpServer.kill();
      process.exit(0);
    } catch (e) {
      // Not complete JSON yet, wait for more data
    }
  }
});

mcpServer.stderr.on('data', (data) => {
  errorBuffer += data.toString();
});

mcpServer.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error('❌ MCP server exited with code:', code);
    if (errorBuffer) {
      console.error('Error output:', errorBuffer);
    }
  }
});

// Send the request
mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test timed out');
  mcpServer.kill();
  process.exit(1);
}, 10000);