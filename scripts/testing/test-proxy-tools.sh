#!/bin/bash

# Test all MCP tools through proxy endpoints

DASHBOARD_URL="http://localhost:$(cat .dashboard-port 2>/dev/null || echo 8777)"
PROXY_URL="$DASHBOARD_URL/api/mcp-tools"

echo "========================================="
echo "Testing All MCP Tools Through Proxy"
echo "========================================="
echo ""

# Check dashboard is running
echo "Checking dashboard server..."
if ! curl -s "$DASHBOARD_URL/api/health" > /dev/null; then
    echo "❌ Dashboard server not running"
    echo "Start it with: node dashboard-server-bridge.js"
    exit 1
fi
echo "✅ Dashboard server is running"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test a tool
test_tool() {
    local tool_name=$1
    local payload=$2
    local description=$3
    
    echo "Testing: $tool_name - $description"
    
    RESPONSE=$(curl -s -X POST "$PROXY_URL/$tool_name" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$RESPONSE" | grep -q "isError"; then
        echo "  ❌ Failed: $(echo "$RESPONSE" | jq -r '.content[0].text' 2>/dev/null || echo "$RESPONSE")"
        ((TESTS_FAILED++))
    else
        echo "  ✅ Success"
        ((TESTS_PASSED++))
    fi
    echo ""
}

echo "📝 Testing Memory Tools"
echo "========================"

# Test add_memory
MEMORY_ID=""
test_tool "add_memory" \
    '{"content": "Test memory from proxy", "project": "proxy-test", "category": "code"}' \
    "Add a test memory"

# Extract memory ID from previous test if successful
if [ $TESTS_PASSED -eq 1 ]; then
    MEMORY_RESPONSE=$(curl -s -X POST "$PROXY_URL/add_memory" \
        -H "Content-Type: application/json" \
        -d '{"content": "Memory to get ID", "project": "proxy-test"}')
    MEMORY_ID=$(echo "$MEMORY_RESPONSE" | grep -oP 'ID: \K[a-f0-9-]+' | head -1)
fi

# Test list_memories
test_tool "list_memories" \
    '{"limit": 5, "project": "proxy-test"}' \
    "List recent memories"

# Test search_memories
test_tool "search_memories" \
    '{"query": "proxy", "project": "proxy-test"}' \
    "Search for proxy-related memories"

# Test get_memory (if we have an ID)
if [ ! -z "$MEMORY_ID" ]; then
    test_tool "get_memory" \
        "{\"id\": \"$MEMORY_ID\"}" \
        "Get specific memory by ID"
fi

echo "📋 Testing Task Tools"
echo "====================="

# Test create_task
TASK_RESPONSE=$(curl -s -X POST "$PROXY_URL/create_task" \
    -H "Content-Type: application/json" \
    -d '{"title": "Test task from proxy", "description": "Testing proxy architecture", "project": "proxy-test", "priority": "medium"}')

TASK_ID=""
if echo "$TASK_RESPONSE" | grep -q "ID:"; then
    TASK_ID=$(echo "$TASK_RESPONSE" | grep -oP 'ID: \K[a-f0-9-]+' | head -1)
    echo "Testing: create_task - Create a test task"
    echo "  ✅ Success (ID: $TASK_ID)"
    ((TESTS_PASSED++))
else
    echo "Testing: create_task - Create a test task"
    echo "  ❌ Failed"
    ((TESTS_FAILED++))
fi
echo ""

# Test list_tasks
test_tool "list_tasks" \
    '{"project": "proxy-test", "status": "todo"}' \
    "List tasks in project"

# Test update_task (if we have an ID)
if [ ! -z "$TASK_ID" ]; then
    test_tool "update_task" \
        "{\"id\": \"$TASK_ID\", \"status\": \"in_progress\"}" \
        "Update task status"
    
    test_tool "get_task_context" \
        "{\"id\": \"$TASK_ID\"}" \
        "Get task context with related data"
fi

echo "🔧 Testing Utility Tools"
echo "========================"

# Test test_tool
test_tool "test_tool" \
    '{"message": "Final test through proxy"}' \
    "Basic connectivity test"

# Test generate_dropoff
test_tool "generate_dropoff" \
    '{"session_summary": "Testing proxy architecture", "include_recent_memories": true, "recent_memory_count": 3, "output_format": "markdown"}' \
    "Generate session dropoff"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "✅ Passed: $TESTS_PASSED"
echo "❌ Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 All tests passed successfully!"
    exit 0
else
    echo "⚠️  Some tests failed. Check the output above for details."
    exit 1
fi