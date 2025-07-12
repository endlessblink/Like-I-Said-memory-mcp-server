#!/bin/bash

# Like-I-Said MCP Server v2 - WSL Diagnostic Script
# This script diagnoses and fixes common MCP connection issues on WSL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Like-I-Said MCP Server v2 - WSL Diagnostic Tool ===${NC}"
echo

# Function to check if running in WSL
check_wsl() {
    echo -e "${YELLOW}[1/10] Checking WSL environment...${NC}"
    if [[ -n "$WSL_DISTRO_NAME" ]] || [[ -n "$WSL_INTEROP" ]]; then
        echo -e "${GREEN}✓ Running in WSL: $WSL_DISTRO_NAME${NC}"
        
        # Get Windows host IP
        if [[ -f /etc/resolv.conf ]]; then
            WINDOWS_HOST=$(grep nameserver /etc/resolv.conf | awk '{print $2}')
            echo -e "${GREEN}✓ Windows host IP: $WINDOWS_HOST${NC}"
        fi
    else
        echo -e "${RED}✗ Not running in WSL${NC}"
        exit 1
    fi
    echo
}

# Function to check Node.js installation
check_nodejs() {
    echo -e "${YELLOW}[2/10] Checking Node.js installation...${NC}"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
        
        # Check if version is sufficient (v16+)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ $NODE_MAJOR -lt 16 ]; then
            echo -e "${RED}✗ Node.js version too old. Please upgrade to v16 or higher${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Node.js not installed${NC}"
        exit 1
    fi
    echo
}

# Function to check project setup
check_project() {
    echo -e "${YELLOW}[3/10] Checking project setup...${NC}"
    
    # Check if we're in the right directory
    if [[ ! -f "server-markdown.js" ]]; then
        echo -e "${RED}✗ Not in Like-I-Said MCP Server directory${NC}"
        echo -e "${YELLOW}  Please cd to the project directory first${NC}"
        exit 1
    fi
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        echo -e "${YELLOW}⚠ node_modules not found. Installing dependencies...${NC}"
        npm install
    else
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    fi
    
    # Check critical files
    for file in "server-markdown.js" "dashboard-server-bridge.js" "package.json"; do
        if [[ -f "$file" ]]; then
            echo -e "${GREEN}✓ Found: $file${NC}"
        else
            echo -e "${RED}✗ Missing: $file${NC}"
            exit 1
        fi
    done
    echo
}

# Function to test MCP server
test_mcp_server() {
    echo -e "${YELLOW}[4/10] Testing MCP server...${NC}"
    
    # Test basic MCP functionality
    echo -e "Testing tools/list..."
    TOOLS_RESPONSE=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | timeout 5 node server-markdown.js 2>&1)
    
    if echo "$TOOLS_RESPONSE" | grep -q '"result"'; then
        TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | grep -o '"name"' | wc -l)
        echo -e "${GREEN}✓ MCP server responding correctly${NC}"
        echo -e "${GREEN}✓ Found $TOOL_COUNT tools${NC}"
    else
        echo -e "${RED}✗ MCP server not responding correctly${NC}"
        echo -e "${RED}Response: $TOOLS_RESPONSE${NC}"
        exit 1
    fi
    
    # Test test_tool
    echo -e "\nTesting test_tool..."
    TEST_RESPONSE=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "test_tool", "arguments": {"message": "WSL diagnostic test"}}}' | timeout 5 node server-markdown.js 2>&1)
    
    if echo "$TEST_RESPONSE" | grep -q "WSL diagnostic test"; then
        echo -e "${GREEN}✓ test_tool working correctly${NC}"
    else
        echo -e "${RED}✗ test_tool failed${NC}"
        echo -e "${RED}Response: $TEST_RESPONSE${NC}"
    fi
    echo
}

# Function to check file permissions
check_permissions() {
    echo -e "${YELLOW}[5/10] Checking file permissions...${NC}"
    
    # Check memories directory
    if [[ ! -d "memories" ]]; then
        echo -e "${YELLOW}⚠ Creating memories directory...${NC}"
        mkdir -p memories/default
    fi
    
    # Check tasks directory
    if [[ ! -d "tasks" ]]; then
        echo -e "${YELLOW}⚠ Creating tasks directory...${NC}"
        mkdir -p tasks
    fi
    
    # Check write permissions
    if touch memories/test-permission.tmp 2>/dev/null; then
        rm memories/test-permission.tmp
        echo -e "${GREEN}✓ Write permissions OK for memories directory${NC}"
    else
        echo -e "${RED}✗ No write permissions for memories directory${NC}"
        exit 1
    fi
    echo
}

# Function to generate Claude Desktop config
generate_claude_config() {
    echo -e "${YELLOW}[6/10] Generating Claude Desktop configuration...${NC}"
    
    # Get the WSL path
    WSL_PATH=$(pwd)
    
    # Convert WSL path to Windows path
    WINDOWS_PATH=$(wslpath -w "$WSL_PATH")
    
    # Generate config for WSL execution
    cat > claude_desktop_config_wsl.json << EOF
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "wsl",
      "args": [
        "-e",
        "bash",
        "-c",
        "cd '$WSL_PATH' && node server-markdown.js"
      ]
    }
  }
}
EOF

    # Generate config for Windows Node.js execution (if Node.js is installed on Windows)
    cat > claude_desktop_config_windows.json << EOF
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["$WINDOWS_PATH\\server-markdown.js"]
    }
  }
}
EOF

    echo -e "${GREEN}✓ Generated claude_desktop_config_wsl.json${NC}"
    echo -e "${GREEN}✓ Generated claude_desktop_config_windows.json${NC}"
    echo
    echo -e "${BLUE}Copy one of these configurations to:${NC}"
    echo -e "${YELLOW}Windows: %APPDATA%\\Claude\\claude_desktop_config.json${NC}"
    echo -e "${YELLOW}macOS: ~/Library/Application Support/Claude/claude_desktop_config.json${NC}"
    echo
}

# Function to check API server
check_api_server() {
    echo -e "${YELLOW}[7/10] Checking API server...${NC}"
    
    # Check if API server is running
    if lsof -i :3001 &> /dev/null; then
        echo -e "${GREEN}✓ API server is running on port 3001${NC}"
    else
        echo -e "${YELLOW}⚠ API server not running. Starting it...${NC}"
        nohup node dashboard-server-bridge.js > api-server.log 2>&1 &
        sleep 2
        
        if lsof -i :3001 &> /dev/null; then
            echo -e "${GREEN}✓ API server started successfully${NC}"
        else
            echo -e "${RED}✗ Failed to start API server${NC}"
        fi
    fi
    echo
}

# Function to check dashboard
check_dashboard() {
    echo -e "${YELLOW}[8/10] Checking React dashboard...${NC}"
    
    # Check if dashboard is built
    if [[ -d "dist" ]]; then
        echo -e "${GREEN}✓ Dashboard is built${NC}"
    else
        echo -e "${YELLOW}⚠ Dashboard not built. Building...${NC}"
        npm run build
    fi
    
    # Check if dev server is running
    if lsof -i :5173 &> /dev/null; then
        echo -e "${GREEN}✓ Dev server is running on port 5173${NC}"
    else
        echo -e "${YELLOW}ℹ Dev server not running. Run 'npm run dev' to start it${NC}"
    fi
    echo
}

# Function to test Ollama connectivity (if needed)
check_ollama() {
    echo -e "${YELLOW}[9/10] Checking Ollama connectivity (optional)...${NC}"
    
    # Try different Ollama URLs
    OLLAMA_URLS=(
        "http://localhost:11434"
        "http://$WINDOWS_HOST:11434"
        "http://host.docker.internal:11434"
    )
    
    OLLAMA_FOUND=false
    for url in "${OLLAMA_URLS[@]}"; do
        if curl -s "$url/api/tags" &> /dev/null; then
            echo -e "${GREEN}✓ Ollama found at: $url${NC}"
            OLLAMA_FOUND=true
            break
        fi
    done
    
    if ! $OLLAMA_FOUND; then
        echo -e "${YELLOW}ℹ Ollama not found (optional feature)${NC}"
    fi
    echo
}

# Function to create diagnostic report
create_report() {
    echo -e "${YELLOW}[10/10] Creating diagnostic report...${NC}"
    
    REPORT_FILE="wsl-diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Like-I-Said MCP Server v2 - WSL Diagnostic Report"
        echo "Generated: $(date)"
        echo "================================================"
        echo
        echo "Environment:"
        echo "- WSL Distro: $WSL_DISTRO_NAME"
        echo "- Windows Host: $WINDOWS_HOST"
        echo "- Node.js: $(node --version)"
        echo "- NPM: $(npm --version)"
        echo "- Working Directory: $(pwd)"
        echo
        echo "MCP Server Test:"
        echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server-markdown.js | jq . 2>/dev/null || echo "Failed to parse JSON"
        echo
        echo "File Structure:"
        ls -la | head -20
        echo
        echo "Memory Files:"
        find memories -type f -name "*.md" | wc -l
        echo
        echo "Task Files:"
        find tasks -type f -name "*.md" 2>/dev/null | wc -l || echo "0"
    } > "$REPORT_FILE"
    
    echo -e "${GREEN}✓ Diagnostic report saved to: $REPORT_FILE${NC}"
    echo
}

# Function to show quick fixes
show_fixes() {
    echo -e "${BLUE}=== Common Fixes ===${NC}"
    echo
    echo -e "${YELLOW}1. If MCP tools don't appear in Claude:${NC}"
    echo "   - Restart Claude Desktop after updating config"
    echo "   - Check the MCP server logs in Claude Desktop"
    echo "   - Use the WSL config (claude_desktop_config_wsl.json)"
    echo
    echo -e "${YELLOW}2. If getting permission errors:${NC}"
    echo "   - Keep project files in WSL filesystem (not /mnt/c/)"
    echo "   - Run: chmod -R 755 memories tasks"
    echo
    echo -e "${YELLOW}3. If connection timeouts occur:${NC}"
    echo "   - Increase Windows Defender exclusions for WSL"
    echo "   - Check Windows Firewall settings"
    echo "   - Try using 127.0.0.1 instead of localhost"
    echo
    echo -e "${YELLOW}4. For best performance:${NC}"
    echo "   - Keep all project files in WSL (~/projects/)"
    echo "   - Use WSL2 instead of WSL1"
    echo "   - Install Node.js in WSL, not Windows"
    echo
}

# Main execution
main() {
    check_wsl
    check_nodejs
    check_project
    test_mcp_server
    check_permissions
    generate_claude_config
    check_api_server
    check_dashboard
    check_ollama
    create_report
    show_fixes
    
    echo -e "${GREEN}=== Diagnostic Complete ===${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Copy claude_desktop_config_wsl.json to Claude's config location"
    echo "2. Restart Claude Desktop"
    echo "3. Check if 'like-i-said-memory-v2' appears in available MCP servers"
    echo "4. Test with the 'test_tool' command"
    echo
}

# Run main function
main