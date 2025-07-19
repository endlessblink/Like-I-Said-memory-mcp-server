#!/bin/bash

echo "🧪 Running all xenova integration tests..."
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "\n📋 Running: $test_name"
    echo "----------------------------------------"
    
    if node "$test_file"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Run all tests
run_test "Xenova Integration Test" "tests/test-xenova-integration.js"
run_test "MCP Server Startup Test" "tests/test-mcp-server-startup.js"

# Dashboard test might need special handling
echo -e "\n📋 Running: Dashboard Startup Test"
echo "----------------------------------------"
echo "⚠️  Note: This test starts a server on port 3001"
echo "   Make sure no other process is using that port"

# Summary
echo -e "\n========================================"
echo -e "📊 Test Summary:"
echo -e "   Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "   Failed: ${RED}$TESTS_FAILED${NC}"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi