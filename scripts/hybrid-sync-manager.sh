#!/bin/bash
# Hybrid Sync Manager for Like-I-Said MCP Server
# Handles real-time data sync and git-based code sync

# Configuration
WSL_DIR="/home/endlessblink/projects/like-i-said-mcp-server-v2"
WIN_DIR="/mnt/d/APPSNospaces/like-i-said-mcp-server-v2"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to sync data directories (bidirectional)
sync_data() {
    echo -e "${GREEN}=== Syncing Data Directories ===${NC}"
    
    # Sync memories
    echo "📝 Syncing memories..."
    rsync -av --delete "$WSL_DIR/memories/" "$WIN_DIR/memories/" 2>/dev/null
    rsync -av --update "$WIN_DIR/memories/" "$WSL_DIR/memories/" 2>/dev/null
    
    # Sync tasks
    echo "✅ Syncing tasks..."
    rsync -av --delete "$WSL_DIR/tasks/" "$WIN_DIR/tasks/" 2>/dev/null
    rsync -av --update "$WIN_DIR/tasks/" "$WSL_DIR/tasks/" 2>/dev/null
    
    # Sync data directory
    echo "⚙️  Syncing data..."
    rsync -av --delete "$WSL_DIR/data/" "$WIN_DIR/data/" 2>/dev/null
    rsync -av --update "$WIN_DIR/data/" "$WSL_DIR/data/" 2>/dev/null
    
    # Sync vectors if exists
    if [ -d "$WSL_DIR/vectors" ] || [ -d "$WIN_DIR/vectors" ]; then
        echo "🔍 Syncing vectors..."
        rsync -av --delete "$WSL_DIR/vectors/" "$WIN_DIR/vectors/" 2>/dev/null
        rsync -av --update "$WIN_DIR/vectors/" "$WSL_DIR/vectors/" 2>/dev/null
    fi
    
    # Sync session-dropoffs if exists
    if [ -d "$WSL_DIR/session-dropoffs" ] || [ -d "$WIN_DIR/session-dropoffs" ]; then
        echo "📤 Syncing session-dropoffs..."
        rsync -av --delete "$WSL_DIR/session-dropoffs/" "$WIN_DIR/session-dropoffs/" 2>/dev/null
        rsync -av --update "$WIN_DIR/session-dropoffs/" "$WSL_DIR/session-dropoffs/" 2>/dev/null
    fi
}

# Function to check git status
check_git_status() {
    echo -e "\n${YELLOW}=== Git Status Check ===${NC}"
    cd "$1"
    
    if [ -d ".git" ]; then
        # Check for uncommitted changes
        if ! git diff --quiet || ! git diff --cached --quiet; then
            echo -e "${RED}⚠️  Uncommitted changes in $1${NC}"
            git status --short
        else
            echo -e "${GREEN}✓ No uncommitted changes${NC}"
        fi
        
        # Check if behind/ahead of remote
        git fetch --quiet
        LOCAL=$(git rev-parse @)
        REMOTE=$(git rev-parse @{u} 2>/dev/null)
        BASE=$(git merge-base @ @{u} 2>/dev/null)
        
        if [ "$LOCAL" = "$REMOTE" ]; then
            echo -e "${GREEN}✓ Up to date with remote${NC}"
        elif [ "$LOCAL" = "$BASE" ]; then
            echo -e "${YELLOW}⬇️  Behind remote (need to pull)${NC}"
        elif [ "$REMOTE" = "$BASE" ]; then
            echo -e "${YELLOW}⬆️  Ahead of remote (need to push)${NC}"
        else
            echo -e "${RED}⚠️  Diverged from remote${NC}"
        fi
    else
        echo -e "${RED}Not a git repository${NC}"
    fi
}

# Function to setup file watchers
setup_watchers() {
    echo -e "\n${GREEN}=== Setting Up File Watchers ===${NC}"
    
    # Create watcher script
    cat > /tmp/like-i-said-watcher.sh << 'EOF'
#!/bin/bash
WSL_DIR="/home/endlessblink/projects/like-i-said-mcp-server-v2"
WIN_DIR="/mnt/d/APPSNospaces/like-i-said-mcp-server-v2"

# Watch for changes and sync
inotifywait -m -r -e modify,create,delete \
    "$WSL_DIR/memories" "$WSL_DIR/tasks" "$WSL_DIR/data" \
    "$WIN_DIR/memories" "$WIN_DIR/tasks" "$WIN_DIR/data" \
    2>/dev/null | while read path event file; do
    
    # Debounce - wait a bit to collect multiple changes
    sleep 0.5
    
    # Determine direction and sync
    if [[ "$path" == "$WSL_DIR"* ]]; then
        rsync -aq "${path}${file}" "${path/$WSL_DIR/$WIN_DIR}" 2>/dev/null
    else
        rsync -aq "${path}${file}" "${path/$WIN_DIR/$WSL_DIR}" 2>/dev/null
    fi
done
EOF
    
    chmod +x /tmp/like-i-said-watcher.sh
    echo "File watcher script created at /tmp/like-i-said-watcher.sh"
}

# Main menu
main_menu() {
    echo -e "\n${GREEN}Like-I-Said Hybrid Sync Manager${NC}"
    echo "================================"
    echo "1. Sync data directories now"
    echo "2. Check git status (both locations)"
    echo "3. Setup real-time watchers"
    echo "4. Full sync (data + git pull)"
    echo "5. Exit"
    echo
    read -p "Select option: " choice
    
    case $choice in
        1)
            sync_data
            ;;
        2)
            check_git_status "$WSL_DIR"
            echo
            check_git_status "$WIN_DIR"
            ;;
        3)
            setup_watchers
            echo -e "${YELLOW}Run the watcher with: bash /tmp/like-i-said-watcher.sh${NC}"
            ;;
        4)
            sync_data
            echo -e "\n${GREEN}Pulling latest code...${NC}"
            cd "$WSL_DIR" && git pull
            cd "$WIN_DIR" && git pull
            ;;
        5)
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    # Loop back to menu
    main_menu
}

# Run main menu
main_menu