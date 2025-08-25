#!/bin/bash

# Claude Code MCP Manager
# Prevents API Error 500 by managing MCP server processes
# Usage: ./claude-code-mcp-manager.sh [action]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/claude-code-mcp-manager.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Kill all MCP processes
kill_all_mcp() {
    log "🧹 Cleaning up all MCP processes..."
    
    # Kill context7-mcp processes
    pkill -f "context7-mcp" 2>/dev/null || true
    
    # Kill sequential-thinking processes
    pkill -f "mcp-server-sequential-thinking" 2>/dev/null || true
    
    # Kill playwright processes
    pkill -f "mcp-server-playwright" 2>/dev/null || true
    
    # Kill like-i-said processes
    pkill -f "server-markdown.js" 2>/dev/null || true
    
    sleep 2
    
    # Force kill if any remain
    ps aux | grep -E "(context7-mcp|mcp-server-sequential-thinking|mcp-server-playwright|server-markdown)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
    
    log "✅ MCP processes cleaned up"
}

# Start project-specific MCP server
start_project_mcp() {
    local project_dir="$1"
    
    if [[ -z "$project_dir" ]]; then
        log "❌ No project directory specified"
        return 1
    fi
    
    if [[ ! -d "$project_dir" ]]; then
        log "❌ Project directory does not exist: $project_dir"
        return 1
    fi
    
    log "🚀 Starting MCP server for project: $project_dir"
    
    cd "$project_dir"
    
    # Clean up any existing database files
    if [[ -f "data/tasks-v3.db" ]]; then
        rm -f data/tasks-v3.db*
        log "🗑️ Cleaned up existing database"
    fi
    
    # Start the server in background
    MCP_QUIET=true MCP_FAST_START=true nohup node server-markdown.js > /tmp/mcp-server-${project_dir##*/}.log 2>&1 &
    
    local pid=$!
    log "✅ Started MCP server (PID: $pid)"
    
    # Wait for server to initialize
    sleep 5
    
    if kill -0 "$pid" 2>/dev/null; then
        log "✅ MCP server is running successfully"
        return 0
    else
        log "❌ MCP server failed to start"
        return 1
    fi
}

# Check system health
check_health() {
    log "🔍 Checking MCP system health..."
    
    # Count processes
    local context7_count=$(ps aux | grep -c "context7-mcp" || echo "0")
    local sequential_count=$(ps aux | grep -c "mcp-server-sequential-thinking" || echo "0")
    local playwright_count=$(ps aux | grep -c "mcp-server-playwright" || echo "0")
    local likeisaid_count=$(ps aux | grep -c "server-markdown.js" || echo "0")
    
    local total=$((context7_count + sequential_count + playwright_count + likeisaid_count))
    
    log "📊 Process counts:"
    log "   Context7: $context7_count"
    log "   Sequential: $sequential_count"
    log "   Playwright: $playwright_count"
    log "   Like-I-Said: $likeisaid_count"
    log "   Total: $total"
    
    # Health thresholds
    if [[ $context7_count -gt 5 ]] || [[ $sequential_count -gt 5 ]] || [[ $playwright_count -gt 5 ]]; then
        log "⚠️  Process leak detected! Consider running cleanup."
        return 1
    fi
    
    if [[ $total -gt 15 ]]; then
        log "⚠️  Too many MCP processes running ($total). Auto-cleanup recommended."
        return 1
    fi
    
    log "✅ System health is good"
    return 0
}

# Setup project isolation
setup_project_isolation() {
    local project_dir="$1"
    
    if [[ -z "$project_dir" ]]; then
        log "❌ No project directory specified"
        return 1
    fi
    
    log "🔧 Setting up project isolation for: $project_dir"
    
    cd "$project_dir"
    
    # Create project-specific MCP config
    local mcp_config=".claude/mcp.json"
    mkdir -p ".claude"
    
    cat > "$mcp_config" << EOF
{
  "mcpServers": {
    "$(basename "$project_dir")-mcp": {
      "command": "node",
      "args": ["$project_dir/server-markdown.js"],
      "env": {
        "MCP_QUIET": "true",
        "MCP_FAST_START": "true",
        "MCP_MODE": "true",
        "PROJECT_ISOLATION": "true"
      }
    }
  }
}
EOF
    
    log "✅ Created project-specific MCP config: $mcp_config"
}

# Main menu
show_menu() {
    echo ""
    echo "🛠️  Claude Code MCP Manager"
    echo ""
    echo "1) Check Health"
    echo "2) Clean All MCP Processes"
    echo "3) Start Project MCP"
    echo "4) Setup Project Isolation"
    echo "5) Monitor (continuous)"
    echo "6) Emergency Reset"
    echo "q) Quit"
    echo ""
    read -p "Choose action: " choice
}

# Monitor continuously
monitor() {
    log "👁️  Starting continuous monitoring..."
    
    while true; do
        if ! check_health; then
            log "🚨 Health check failed - running auto-cleanup"
            kill_all_mcp
            sleep 10
        fi
        
        sleep 30
    done
}

# Emergency reset - nuclear option
emergency_reset() {
    log "💥 EMERGENCY RESET - This will kill ALL MCP processes and clean everything"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log "❌ Emergency reset cancelled"
        return
    fi
    
    # Kill everything MCP-related
    kill_all_mcp
    
    # Clean up all database files
    find /mnt/d -name "tasks-v3.db*" -delete 2>/dev/null || true
    find /home -name "tasks-v3.db*" -delete 2>/dev/null || true
    
    # Clean up log files
    rm -f /tmp/mcp-*.log 2>/dev/null || true
    rm -f /tmp/claude-code-*.log 2>/dev/null || true
    
    log "💥 Emergency reset completed - restart Claude Code now"
}

# Main execution
case "${1:-menu}" in
    "health"|"status")
        check_health
        ;;
    "cleanup"|"clean")
        kill_all_mcp
        ;;
    "start")
        if [[ -n "$2" ]]; then
            start_project_mcp "$2"
        else
            start_project_mcp "$(pwd)"
        fi
        ;;
    "isolate"|"setup")
        if [[ -n "$2" ]]; then
            setup_project_isolation "$2"
        else
            setup_project_isolation "$(pwd)"
        fi
        ;;
    "monitor")
        monitor
        ;;
    "reset"|"emergency")
        emergency_reset
        ;;
    "menu"|*)
        while true; do
            show_menu
            case $choice in
                1) check_health; echo "Press Enter to continue..."; read ;;
                2) kill_all_mcp; echo "Press Enter to continue..."; read ;;
                3) read -p "Project directory (current: $(pwd)): " proj_dir
                   start_project_mcp "${proj_dir:-$(pwd)}"
                   echo "Press Enter to continue..."; read ;;
                4) read -p "Project directory (current: $(pwd)): " proj_dir
                   setup_project_isolation "${proj_dir:-$(pwd)}"
                   echo "Press Enter to continue..."; read ;;
                5) monitor ;;
                6) emergency_reset; echo "Press Enter to continue..."; read ;;
                q|Q) exit 0 ;;
                *) echo "Invalid option" ;;
            esac
        done
        ;;
esac