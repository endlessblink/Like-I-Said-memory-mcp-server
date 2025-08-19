#!/usr/bin/env node

const { spawn } = require('child_process');

const server = spawn('node', ['server-markdown.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send tools/list request
const request = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
}) + '\n';

server.stdin.write(request);

let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

setTimeout(() => {
  try {
    const response = JSON.parse(output);
    if (response.result && response.result.tools) {
      console.log(`Total tools: ${response.result.tools.length}`);
      
      // Check each tool for schema issues
      response.result.tools.forEach((tool, index) => {
        try {
          // Basic validation
          if (!tool.inputSchema) {
            console.log(`Tool ${index + 1} (${tool.name}): Missing inputSchema`);
          } else {
            const schema = tool.inputSchema;
            if (schema.additionalProperties === undefined && !schema['$schema']) {
              console.log(`Tool ${index + 1} (${tool.name}): Missing $schema and additionalProperties`);
            }
            
            // Check for nested additionalProperties issues
            if (schema.properties) {
              Object.keys(schema.properties).forEach(prop => {
                const propDef = schema.properties[prop];
                if (propDef.properties && propDef.additionalProperties !== undefined) {
                  // This is OK - nested objects can have additionalProperties
                }
              });
            }
          }
        } catch (e) {
          console.log(`Tool ${index + 1} (${tool.name}): Validation error - ${e.message}`);
        }
      });
      
      // Show tool 45 if it exists
      if (response.result.tools[44]) {
        console.log('\nTool 45 details:');
        console.log('Name:', response.result.tools[44].name);
        console.log('Schema:', JSON.stringify(response.result.tools[44].inputSchema, null, 2));
      }
    } else {
      console.log('No tools found or error in response');
      console.log('Response:', output);
    }
  } catch (e) {
    console.log('Failed to parse response:', e.message);
    console.log('Raw output:', output);
  }
  
  server.kill();
  process.exit(0);
}, 3000);