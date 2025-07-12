#!/bin/bash
# Unison sync for Like-I-Said MCP Server data directories

WSL_BASE="/home/endlessblink/projects/like-i-said-mcp-server-v2"
WIN_BASE="/mnt/d/APPSNospaces/like-i-said-mcp-server-v2"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting Unison sync...${NC}"

# Sync each directory
for dir in memories tasks data vectors; do
    if [ -d "$WSL_BASE/$dir" ] || [ -d "$WIN_BASE/$dir" ]; then
        echo -e "${YELLOW}Syncing $dir...${NC}"
        unison "$WSL_BASE/$dir" "$WIN_BASE/$dir" \
            -auto \
            -batch \
            -times \
            -perms 0 \
            -ignore "Name .git" \
            -ignore "Name *.tmp" \
            -ignore "Name .DS_Store"
    fi
done

echo -e "${GREEN}Sync complete!${NC}"

# Optional: Run in watch mode
if [ "$1" = "watch" ]; then
    echo -e "${YELLOW}Watching for changes...${NC}"
    while true; do
        inotifywait -r -e modify,create,delete \
            "$WSL_BASE/memories" "$WSL_BASE/tasks" \
            "$WIN_BASE/memories" "$WIN_BASE/tasks" \
            2>/dev/null
        sleep 1
        $0  # Run sync again
    done
fi