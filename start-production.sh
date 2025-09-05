#!/bin/bash

# Like-I-Said MCP Production Startup Script
# Handles server selection, health checks, and graceful management

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${MCP_CONFIG_FILE:-$SCRIPT_DIR/mcp-config.json}"
LOG_DIR="${LOG_DIR:-$SCRIPT_DIR/logs}"
PID_FILE="$SCRIPT_DIR/.mcp-server.pid"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=2

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create log directory if needed
mkdir -p "$LOG_DIR"

# Check if server is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Stop running server
stop_server() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        log_info "Stopping MCP server (PID: $PID)..."
        kill -SIGTERM "$PID" 2>/dev/null || true
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                log_info "Server stopped gracefully"
                rm -f "$PID_FILE"
                return 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        log_warn "Force killing server..."
        kill -SIGKILL "$PID" 2>/dev/null || true
        rm -f "$PID_FILE"
    else
        log_info "No server running"
    fi
}

# Select server based on requirements
select_server() {
    local SERVER_TYPE="${MCP_SERVER_TYPE:-auto}"
    
    case "$SERVER_TYPE" in
        minimal)
            echo "$SCRIPT_DIR/server-minimal.js"
            ;;
        enhanced)
            echo "$SCRIPT_DIR/server-enhanced.js"
            ;;
        core)
            echo "$SCRIPT_DIR/server-core.js"
            ;;
        auto)
            # Auto-select based on what's available and working
            if [ -f "$SCRIPT_DIR/server-enhanced.js" ]; then
                echo "$SCRIPT_DIR/server-enhanced.js"
            elif [ -f "$SCRIPT_DIR/server-minimal.js" ]; then
                echo "$SCRIPT_DIR/server-minimal.js"
            elif [ -f "$SCRIPT_DIR/server-core.js" ]; then
                echo "$SCRIPT_DIR/server-core.js"
            else
                log_error "No MCP server found!"
                exit 1
            fi
            ;;
        *)
            echo "$SERVER_TYPE"
            ;;
    esac
}

# Health check
health_check() {
    local SERVER_FILE="$1"
    
    # Simple test: send list tools request
    local RESPONSE=$(echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
        timeout 5 node "$SERVER_FILE" 2>/dev/null | \
        grep -o '"tools"' || echo "")
    
    if [ -n "$RESPONSE" ]; then
        return 0
    fi
    return 1
}

# Start server
start_server() {
    local SERVER_FILE=$(select_server)
    
    if [ ! -f "$SERVER_FILE" ]; then
        log_error "Server file not found: $SERVER_FILE"
        exit 1
    fi
    
    log_info "Selected server: $(basename "$SERVER_FILE")"
    
    # Test server first
    log_info "Running health check..."
    if health_check "$SERVER_FILE"; then
        log_info "Health check passed"
    else
        log_warn "Health check failed, but continuing..."
    fi
    
    # Set environment variables
    export MCP_CONFIG_FILE="$CONFIG_FILE"
    export LOG_LEVEL="${LOG_LEVEL:-info}"
    export LOG_TO_FILE="${LOG_TO_FILE:-true}"
    export NODE_ENV="${NODE_ENV:-production}"
    
    # Start server based on mode
    if [ "${MCP_MODE}" = "stdio" ] || [ "${MCP_MODE}" = "true" ]; then
        # Stdio mode for Claude Code
        log_info "Starting in stdio mode..."
        exec node "$SERVER_FILE"
    else
        # Background mode for testing/dashboard
        log_info "Starting in background mode..."
        
        LOG_FILE="$LOG_DIR/mcp-$(date +%Y%m%d).log"
        nohup node "$SERVER_FILE" >> "$LOG_FILE" 2>&1 &
        PID=$!
        echo $PID > "$PID_FILE"
        
        log_info "Server started (PID: $PID)"
        log_info "Logs: $LOG_FILE"
        
        # Verify startup
        sleep 2
        if ps -p "$PID" > /dev/null 2>&1; then
            log_info "Server is running"
            
            # Show initial status
            tail -n 20 "$LOG_FILE" | grep -E "ready|started|error" || true
        else
            log_error "Server failed to start"
            cat "$LOG_FILE" | tail -n 50
            exit 1
        fi
    fi
}

# Restart server
restart_server() {
    stop_server
    sleep 1
    start_server
}

# Status check
status_server() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        log_info "MCP server is running (PID: $PID)"
        
        # Show memory usage
        if command -v ps > /dev/null; then
            ps -o pid,vsz,rss,comm -p "$PID" 2>/dev/null || true
        fi
        
        # Show recent logs
        if [ -d "$LOG_DIR" ]; then
            LOG_FILE=$(ls -t "$LOG_DIR"/mcp-*.log 2>/dev/null | head -1)
            if [ -n "$LOG_FILE" ]; then
                echo ""
                log_info "Recent logs:"
                tail -n 10 "$LOG_FILE" | grep -E "ready|error|warn" || true
            fi
        fi
    else
        log_warn "MCP server is not running"
        return 1
    fi
}

# Show usage
usage() {
    cat << EOF
Usage: $0 {start|stop|restart|status|test}

Commands:
  start    Start the MCP server
  stop     Stop the MCP server
  restart  Restart the MCP server
  status   Check server status
  test     Run health check

Environment Variables:
  MCP_SERVER_TYPE  Server to use (minimal|enhanced|core|auto) [default: auto]
  MCP_MODE         Mode to run in (stdio|background) [default: background]
  MCP_CONFIG_FILE  Configuration file path [default: ./mcp-config.json]
  LOG_LEVEL        Logging level (error|warn|info|debug) [default: info]
  LOG_DIR          Directory for logs [default: ./logs]

Examples:
  # Start with minimal server
  MCP_SERVER_TYPE=minimal $0 start
  
  # Start for Claude Code (stdio mode)
  MCP_MODE=stdio $0 start
  
  # Start with debug logging
  LOG_LEVEL=debug $0 start

EOF
}

# Main command handling
case "${1:-}" in
    start)
        if check_running; then
            log_warn "Server already running"
            status_server
        else
            start_server
        fi
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    test)
        SERVER_FILE=$(select_server)
        log_info "Testing server: $SERVER_FILE"
        if health_check "$SERVER_FILE"; then
            log_info "✅ Server test passed"
        else
            log_error "❌ Server test failed"
            exit 1
        fi
        ;;
    *)
        usage
        exit 1
        ;;
esac