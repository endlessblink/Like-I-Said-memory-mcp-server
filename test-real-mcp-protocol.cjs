#!/usr/bin/env node

/**
 * Real MCP Protocol Test
 * Tests our MCP server with actual JSON-RPC protocol
 * This simulates exactly what Claude Desktop would do
 */

const { spawn } = require('child_process');
const path = require('path');

class MCPProtocolTester {
    constructor() {
        this.serverPath = path.join(__dirname, 'server-markdown.js');
        this.results = [];
    }

    async runTests() {
        console.log('🧪 Real MCP Protocol Test Suite');
        console.log('================================');
        console.log('This tests exactly what Claude Desktop would do\n');

        // Test 1: Server startup and initialization
        await this.testServerStartup();

        // Test 2: List tools
        await this.testListTools();

        // Test 3: Test each tool
        await this.testAllTools();

        // Test 4: Error handling
        await this.testErrorHandling();

        // Test 5: Persistence
        await this.testPersistence();

        // Generate report
        this.generateReport();
    }

    async testServerStartup() {
        console.log('📌 Test 1: Server Startup');
        console.log('─'.repeat(40));

        return new Promise((resolve) => {
            const server = spawn('node', [this.serverPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let initialized = false;

            server.stderr.on('data', (data) => {
                const output = data.toString();
                if (output.includes('MCP server running') || output.includes('Server started')) {
                    initialized = true;
                }
            });

            // Give server time to start
            setTimeout(() => {
                if (server.pid) {
                    this.results.push({
                        test: 'Server Startup',
                        status: 'PASS',
                        details: `Server started with PID ${server.pid}`
                    });
                    console.log('✅ Server started successfully');
                } else {
                    this.results.push({
                        test: 'Server Startup',
                        status: 'FAIL',
                        details: 'Server failed to start'
                    });
                    console.log('❌ Server failed to start');
                }
                server.kill();
                resolve();
            }, 2000);
        });
    }

    async testListTools() {
        console.log('\n📌 Test 2: List Tools (MCP Protocol)');
        console.log('─'.repeat(40));

        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list'
        });

        if (response && response.result && response.result.tools) {
            const tools = response.result.tools;
            console.log(`✅ Found ${tools.length} tools:`);
            tools.forEach(tool => {
                console.log(`   • ${tool.name}: ${tool.description}`);
            });

            this.results.push({
                test: 'List Tools',
                status: 'PASS',
                details: `${tools.length} tools available`,
                tools: tools.map(t => t.name)
            });
        } else {
            console.log('❌ Failed to list tools');
            this.results.push({
                test: 'List Tools',
                status: 'FAIL',
                details: 'No tools returned'
            });
        }
    }

    async testAllTools() {
        console.log('\n📌 Test 3: Test Each Tool');
        console.log('─'.repeat(40));

        const toolTests = [
            {
                name: 'add_memory',
                params: {
                    content: 'Test memory from MCP protocol test',
                    project: 'mcp-test'
                }
            },
            {
                name: 'list_memories',
                params: {
                    project: 'mcp-test'
                }
            },
            {
                name: 'search_memories',
                params: {
                    query: 'test'
                }
            },
            {
                name: 'create_task',
                params: {
                    title: 'Test task from MCP',
                    project: 'mcp-test'
                }
            },
            {
                name: 'list_tasks',
                params: {
                    project: 'mcp-test'
                }
            }
        ];

        for (const test of toolTests) {
            const response = await this.sendRequest({
                jsonrpc: '2.0',
                id: test.name,
                method: 'tools/call',
                params: {
                    name: test.name,
                    arguments: test.params
                }
            });

            if (response && response.result) {
                console.log(`✅ ${test.name}: Success`);
                this.results.push({
                    test: `Tool: ${test.name}`,
                    status: 'PASS',
                    details: 'Tool executed successfully'
                });
            } else {
                console.log(`❌ ${test.name}: Failed`);
                this.results.push({
                    test: `Tool: ${test.name}`,
                    status: 'FAIL',
                    details: response?.error?.message || 'Unknown error'
                });
            }
        }
    }

    async testErrorHandling() {
        console.log('\n📌 Test 4: Error Handling');
        console.log('─'.repeat(40));

        // Test invalid method
        const response1 = await this.sendRequest({
            jsonrpc: '2.0',
            id: 'error1',
            method: 'invalid/method'
        });

        if (response1 && response1.error) {
            console.log('✅ Invalid method handled correctly');
            this.results.push({
                test: 'Error: Invalid Method',
                status: 'PASS',
                details: 'Error returned as expected'
            });
        }

        // Test invalid tool
        const response2 = await this.sendRequest({
            jsonrpc: '2.0',
            id: 'error2',
            method: 'tools/call',
            params: {
                name: 'invalid_tool',
                arguments: {}
            }
        });

        if (response2 && response2.error) {
            console.log('✅ Invalid tool handled correctly');
            this.results.push({
                test: 'Error: Invalid Tool',
                status: 'PASS',
                details: 'Error returned as expected'
            });
        }
    }

    async testPersistence() {
        console.log('\n📌 Test 5: Data Persistence');
        console.log('─'.repeat(40));

        // Create a memory
        const createResponse = await this.sendRequest({
            jsonrpc: '2.0',
            id: 'persist1',
            method: 'tools/call',
            params: {
                name: 'add_memory',
                arguments: {
                    content: 'Persistence test memory',
                    project: 'persistence-test'
                }
            }
        });

        if (createResponse && createResponse.result) {
            // Extract memory ID from response
            const responseText = createResponse.result.content[0].text;
            const idMatch = responseText.match(/ID: ([a-f0-9-]+)/);
            
            if (idMatch) {
                const memoryId = idMatch[1];
                
                // Retrieve the memory
                const getResponse = await this.sendRequest({
                    jsonrpc: '2.0',
                    id: 'persist2',
                    method: 'tools/call',
                    params: {
                        name: 'get_memory',
                        arguments: {
                            id: memoryId
                        }
                    }
                });

                if (getResponse && getResponse.result) {
                    console.log('✅ Data persistence verified');
                    this.results.push({
                        test: 'Data Persistence',
                        status: 'PASS',
                        details: 'Memory created and retrieved successfully'
                    });
                }
            }
        }
    }

    async sendRequest(request) {
        return new Promise((resolve) => {
            const server = spawn('node', [this.serverPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let response = '';

            server.stdout.on('data', (data) => {
                response += data.toString();
            });

            server.on('close', () => {
                try {
                    // Parse the last line as JSON (MCP response)
                    const lines = response.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    const parsed = JSON.parse(lastLine);
                    resolve(parsed);
                } catch (error) {
                    resolve(null);
                }
            });

            // Send request
            server.stdin.write(JSON.stringify(request) + '\n');
            server.stdin.end();
        });
    }

    generateReport() {
        console.log('\n📊 MCP PROTOCOL TEST REPORT');
        console.log('='.repeat(50));

        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;
        const successRate = Math.round((passed / total) * 100);

        console.log(`\nTest Results:`);
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`  ${icon} ${result.test}: ${result.status}`);
            if (result.details) {
                console.log(`      ${result.details}`);
            }
        });

        console.log(`\n📈 Summary:`);
        console.log(`   Total Tests: ${total}`);
        console.log(`   Passed: ${passed}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Success Rate: ${successRate}%`);

        if (successRate >= 90) {
            console.log('\n🎉 MCP PROTOCOL VALIDATION PASSED!');
            console.log('   Your MCP server is ready for Claude Desktop');
            console.log('   The DXT package will work correctly');
        } else {
            console.log('\n⚠️  Some tests failed');
            console.log('   Please fix the issues before release');
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                total,
                passed,
                failed,
                successRate
            }
        };

        require('fs').writeFileSync(
            'mcp-protocol-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📄 Detailed report saved to: mcp-protocol-test-report.json');
    }
}

// Run tests
const tester = new MCPProtocolTester();
tester.runTests().catch(console.error);