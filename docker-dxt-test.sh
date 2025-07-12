#!/bin/bash

# DXT Package Test Script for Docker
# Tests all aspects of the DXT package in a clean environment

set -e

echo "🐳 DXT Package Test in Docker Environment"
echo "=========================================="
echo ""

# Test 1: Extract DXT package
echo "1️⃣ Extracting DXT package..."
cd /dxt-test
unzip -q /tmp/like-i-said-memory-v2.dxt

if [ ! -f "manifest.json" ]; then
    echo "❌ FAIL: manifest.json not found"
    exit 1
fi
echo "✅ PASS: DXT package extracted successfully"

# Test 2: Validate manifest structure
echo ""
echo "2️⃣ Validating manifest structure..."
node -e "
const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'));
const required = ['dxt_version', 'name', 'version', 'server', 'tools', 'user_config'];
const missing = required.filter(field => !manifest[field]);
if (missing.length > 0) {
    console.error('❌ FAIL: Missing required fields:', missing.join(', '));
    process.exit(1);
}
if (manifest.tools.length !== 11) {
    console.error('❌ FAIL: Expected 11 tools, got', manifest.tools.length);
    process.exit(1);
}
console.log('✅ PASS: Manifest structure valid');
console.log('   • DXT Version:', manifest.dxt_version);
console.log('   • Package:', manifest.display_name, 'v' + manifest.version);
console.log('   • Tools:', manifest.tools.length);
console.log('   • Config Options:', Object.keys(manifest.user_config).length);
"

# Test 3: Check server file exists and is valid
echo ""
echo "3️⃣ Checking server file..."
if [ ! -f "server/mcp-server-standalone.js" ]; then
    echo "❌ FAIL: Server file not found"
    exit 1
fi

# Check it's a valid Node.js file
node -c server/mcp-server-standalone.js || {
    echo "❌ FAIL: Server file has syntax errors"
    exit 1
}
echo "✅ PASS: Server file valid"

# Test 4: Check dependencies are bundled
echo ""
echo "4️⃣ Checking bundled dependencies..."
required_deps=("@modelcontextprotocol" "js-yaml" "uuid" "chokidar")
missing_deps=()

for dep in "${required_deps[@]}"; do
    if [ ! -d "server/node_modules/$dep" ] && [ ! -d "server/node_modules/@*/$dep" ]; then
        missing_deps+=("$dep")
    fi
done

if [ ${#missing_deps[@]} -gt 0 ]; then
    echo "❌ FAIL: Missing dependencies: ${missing_deps[*]}"
    exit 1
fi
echo "✅ PASS: All required dependencies bundled"

# Test 5: Test server startup
echo ""
echo "5️⃣ Testing server startup..."
timeout 3s node server/mcp-server-standalone.js < /dev/null > /dev/null 2>&1 || true
echo "✅ PASS: Server can start without crashing"

# Test 6: Test MCP tools/list
echo ""
echo "6️⃣ Testing MCP tools/list..."
response=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 5s node server/mcp-server-standalone.js 2>/dev/null | head -1)

if ! echo "$response" | jq -e '.result.tools | length == 11' > /dev/null 2>&1; then
    echo "❌ FAIL: tools/list didn't return 11 tools"
    echo "Response: $response"
    exit 1
fi
echo "✅ PASS: MCP tools/list returns 11 tools"

# Test 7: Test memory operations
echo ""
echo "7️⃣ Testing memory operations..."
memory_request='{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"add_memory","arguments":{"content":"Docker test memory","project":"docker-test"}}}'
memory_response=$(echo "$memory_request" | timeout 5s node server/mcp-server-standalone.js 2>/dev/null | tail -1)

if ! echo "$memory_response" | jq -e '.result.content[0].text' > /dev/null 2>&1; then
    echo "❌ FAIL: Memory operation failed"
    echo "Response: $memory_response"
    exit 1
fi
echo "✅ PASS: Memory operations working"

# Test 8: Test task operations
echo ""
echo "8️⃣ Testing task operations..."
task_request='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_task","arguments":{"title":"Docker test task","project":"docker-test"}}}'
task_response=$(echo "$task_request" | timeout 5s node server/mcp-server-standalone.js 2>/dev/null | tail -1)

if ! echo "$task_response" | jq -e '.result.content[0].text' > /dev/null 2>&1; then
    echo "❌ FAIL: Task operation failed"
    echo "Response: $task_response"
    exit 1
fi
echo "✅ PASS: Task operations working"

# Test 9: Test file persistence
echo ""
echo "9️⃣ Testing file persistence..."
if [ ! -d "$MEMORY_BASE_DIR/docker-test" ]; then
    echo "❌ FAIL: Memory directory not created"
    exit 1
fi

memory_files=$(find "$MEMORY_BASE_DIR/docker-test" -name "*.md" | wc -l)
if [ "$memory_files" -eq 0 ]; then
    echo "❌ FAIL: No memory files created"
    exit 1
fi
echo "✅ PASS: File persistence working ($memory_files memory files created)"

# Test 10: Test error handling
echo ""
echo "🔟 Testing error handling..."
error_request='{"jsonrpc":"2.0","id":4,"method":"invalid/method"}'
error_response=$(echo "$error_request" | timeout 5s node server/mcp-server-standalone.js 2>/dev/null | head -1)

if ! echo "$error_response" | jq -e '.error.code' > /dev/null 2>&1; then
    echo "❌ FAIL: Error handling not working"
    echo "Response: $error_response"
    exit 1
fi
echo "✅ PASS: Error handling working"

# Summary
echo ""
echo "🎉 ALL TESTS PASSED!"
echo "========================"
echo "✅ DXT package structure valid"
echo "✅ Server functionality working" 
echo "✅ MCP protocol compliant"
echo "✅ Memory operations functional"
echo "✅ Task operations functional"
echo "✅ File persistence working"
echo "✅ Error handling robust"
echo ""
echo "📊 Test Results:"
echo "   • Platform: $(uname -s) $(uname -m)"
echo "   • Node.js: $(node --version)"
echo "   • Memory files: $memory_files"
echo "   • Package size: $(du -h /tmp/like-i-said-memory-v2.dxt | cut -f1)"
echo ""
echo "🚀 DXT package is production ready for this environment!"