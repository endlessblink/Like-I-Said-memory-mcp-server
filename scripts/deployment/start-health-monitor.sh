#!/bin/bash

# Health Monitor Startup Script
# Starts the health monitoring service for Like-I-Said MCP

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
HEALTH_PORT="${HEALTH_PORT:-8080}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-30000}"
PID_FILE="$SCRIPT_DIR/.health-monitor.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        log_warn "Health monitor already running (PID: $PID)"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Start health monitor
log_info "Starting health monitor on port $HEALTH_PORT..."

export HEALTH_PORT
export HEALTH_INTERVAL

if [ "$1" = "background" ]; then
    # Start in background
    nohup node "$SCRIPT_DIR/lib/health-monitor.js" > "$SCRIPT_DIR/logs/health-monitor.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    log_info "Health monitor started in background (PID: $PID)"
    log_info "Logs: $SCRIPT_DIR/logs/health-monitor.log"
else
    # Start in foreground
    node "$SCRIPT_DIR/lib/health-monitor.js"
fi