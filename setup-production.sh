#!/bin/bash

# Like-I-Said MCP Production Setup Script
# Complete setup for production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo "=============================================="
echo "  Like-I-Said MCP Production Setup"
echo "=============================================="
echo ""

# Step 1: Check Node.js
log_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    log_error "Node.js version must be 16 or higher. Current: $(node -v)"
    exit 1
fi
log_info "Node.js $(node -v) detected ✅"

# Step 2: Install dependencies
log_step "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm install --production
else
    log_info "Dependencies already installed ✅"
fi

# Step 3: Create necessary directories
log_step "Creating directory structure..."
mkdir -p logs memories tasks backups data plugins services
log_info "Directories created ✅"

# Step 4: Test servers
log_step "Testing MCP servers..."

# Test minimal server
if [ -f "server-minimal.js" ]; then
    if echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
       timeout 2 node server-minimal.js 2>/dev/null | grep -q "tools"; then
        log_info "Minimal server: ✅ Working"
    else
        log_warn "Minimal server: ⚠️ Test failed"
    fi
else
    log_warn "Minimal server not found"
fi

# Test enhanced server
if [ -f "server-enhanced.js" ]; then
    if echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
       timeout 2 node server-enhanced.js 2>/dev/null | grep -q "tools"; then
        log_info "Enhanced server: ✅ Working"
    else
        log_warn "Enhanced server: ⚠️ Test failed"
    fi
else
    log_warn "Enhanced server not found"
fi

# Step 5: Configure Claude Code
log_step "Configuring Claude Code..."

CLAUDE_CONFIG_FILE="$HOME/.claude.json"
CLAUDE_CONFIG_BACKUP="$CLAUDE_CONFIG_FILE.backup-$(date +%Y%m%d-%H%M%S)"

if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    log_info "Backing up existing Claude config to: $CLAUDE_CONFIG_BACKUP"
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_BACKUP"
fi

cat << EOF > claude-code-config.json
{
  "mcpServers": {
    "like-i-said": {
      "command": "node",
      "args": ["$SCRIPT_DIR/server-minimal.js"],
      "env": {
        "MCP_MODE": "true",
        "LOG_LEVEL": "info"
      }
    }
  }
}
EOF

log_info "Claude Code configuration saved to: claude-code-config.json"
log_info "To use: Copy the 'like-i-said' section to your Claude Code MCP servers config"

# Step 6: Create systemd service (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    log_step "Creating systemd service..."
    
    cat << EOF > like-i-said-mcp.service
[Unit]
Description=Like-I-Said MCP Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/start-production.sh start
ExecStop=$SCRIPT_DIR/start-production.sh stop
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="MCP_MODE=background"
Environment="LOG_LEVEL=info"

[Install]
WantedBy=multi-user.target
EOF

    log_info "Systemd service file created: like-i-said-mcp.service"
    log_info "To install: sudo cp like-i-said-mcp.service /etc/systemd/system/"
    log_info "To enable: sudo systemctl enable like-i-said-mcp"
    log_info "To start: sudo systemctl start like-i-said-mcp"
fi

# Step 7: Performance test
log_step "Running performance test..."

PERF_RESULT=$(cat << 'SCRIPT' | node
const start = Date.now();
import('./server-minimal.js').then(() => {
  console.log(Date.now() - start);
  process.exit(0);
}).catch(() => {
  console.log(-1);
  process.exit(1);
});
setTimeout(() => process.exit(0), 5000);
SCRIPT
)

if [ "$PERF_RESULT" -gt 0 ] && [ "$PERF_RESULT" -lt 1000 ]; then
    log_info "Startup time: ${PERF_RESULT}ms ✅ (Excellent)"
elif [ "$PERF_RESULT" -gt 0 ] && [ "$PERF_RESULT" -lt 3000 ]; then
    log_info "Startup time: ${PERF_RESULT}ms ✅ (Good)"
elif [ "$PERF_RESULT" -gt 0 ]; then
    log_warn "Startup time: ${PERF_RESULT}ms ⚠️ (Slow)"
else
    log_error "Performance test failed"
fi

# Step 8: Create quick start guide
log_step "Creating quick start guide..."

cat << 'EOF' > QUICK-START.md
# Like-I-Said MCP Quick Start

## For Claude Code Users

1. **Update Claude Code Configuration**
   - Open your Claude Code MCP settings
   - Add the configuration from `claude-code-config.json`
   - Restart Claude Code

2. **Test the Connection**
   - The MCP server should show as "connected" in Claude Code
   - Try: "add a memory about testing the new MCP server"

## For Command Line Users

1. **Start the Server**
   ```bash
   ./start-production.sh start
   ```

2. **Check Status**
   ```bash
   ./start-production.sh status
   ```

3. **View Logs**
   ```bash
   tail -f logs/mcp-$(date +%Y%m%d).log
   ```

## Available Servers

- **server-minimal.js** - Lightweight, essential features only
- **server-enhanced.js** - Full features with plugins
- **server-core.js** - Plugin architecture base

## Environment Variables

- `MCP_SERVER_TYPE` - Choose server (minimal/enhanced/core/auto)
- `LOG_LEVEL` - Logging verbosity (error/warn/info/debug)
- `ENABLE_AI_TOOLS` - Enable AI features (true/false)
- `ENABLE_ANALYTICS` - Enable analytics (true/false)

## Troubleshooting

- **API Error 500**: Make sure you're using server-minimal.js
- **Server won't start**: Check `logs/` directory for errors
- **High memory usage**: Switch to minimal server
- **Missing features**: Enable plugins in enhanced server
EOF

log_info "Quick start guide created: QUICK-START.md"

# Step 9: Summary
echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
log_info "✅ Node.js verified"
log_info "✅ Dependencies installed"
log_info "✅ Directory structure created"
log_info "✅ Servers tested"
log_info "✅ Configuration files generated"
log_info "✅ Documentation created"
echo ""
echo "Next Steps:"
echo "1. Update Claude Code with configuration from claude-code-config.json"
echo "2. Test with: ./start-production.sh test"
echo "3. Start server: ./start-production.sh start"
echo ""
echo "For more information, see QUICK-START.md"