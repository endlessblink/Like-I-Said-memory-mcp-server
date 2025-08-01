import { v3Tools, handleV3Tool } from '../../lib/v3-mcp-tools.js';

console.log('🧪 Testing V3 MCP Tools (Simple)\n');

async function testV3ToolsSimple() {
  try {
    // Test 1: List tools
    console.log('✅ Test 1: V3 MCP Tools Available');
    console.log('==================================');
    console.log(`Found ${v3Tools.length} V3 tools:`);
    v3Tools.forEach((tool, i) => {
      console.log(`${i + 1}. ${tool.name}`);
    });
    
    // Test 2: Create a test project
    console.log('\n✅ Test 2: Create Test Project');
    console.log('==============================');
    const projectResult = await handleV3Tool('create_project', {
      title: 'MCP Tools Test',
      description: 'Testing the V3 MCP tools implementation'
    });
    
    console.log('Result:', projectResult.content[0].text.split('\n').slice(0, 3).join('\n'));
    
    // Test 3: View all projects
    console.log('\n✅ Test 3: View All Projects');
    console.log('============================');
    const viewResult = await handleV3Tool('view_project', {});
    
    // Show just first few lines to avoid too much output
    const lines = viewResult.content[0].text.split('\n');
    console.log(lines.slice(0, 10).join('\n'));
    console.log(`... (${lines.length} total lines)`);
    
    console.log('\n✨ V3 MCP Tools are working!');
    console.log('🎯 Ready to use in the MCP server');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run simple test
testV3ToolsSimple().catch(console.error);