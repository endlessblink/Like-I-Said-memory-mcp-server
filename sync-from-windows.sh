#!/bin/bash

# Sync Windows Like-I-Said MCP Server to WSL
# This script pulls changes from Windows development environment to WSL

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Like-I-Said MCP Server v2 - Windows to WSL Sync ===${NC}"
echo

# Configuration
WSL_DIR="/home/endlessblink/projects/like-i-said-mcp-server-v2"
WINDOWS_DIR="/mnt/d/APPSNospaces/like-i-said-mcp-server-v2"

# Function to check if we're in the right directory
check_directory() {
    if [[ ! -f "server-markdown.js" ]]; then
        echo -e "${RED}Error: Not in Like-I-Said MCP Server directory${NC}"
        exit 1
    fi
}

# Function to check for uncommitted changes
check_uncommitted() {
    echo -e "${YELLOW}[1/4] Checking for uncommitted changes in WSL...${NC}"
    
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${RED}Warning: You have uncommitted changes in WSL${NC}"
        git status --short
        echo
        read -p "Do you want to stash these changes? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash push -m "Auto-stash before Windows sync $(date +%Y-%m-%d_%H-%M-%S)"
            echo -e "${GREEN}✓ Changes stashed${NC}"
        else
            echo -e "${RED}Aborting sync to prevent data loss${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ No uncommitted changes${NC}"
    fi
}

# Function to sync from Windows
sync_from_windows() {
    echo -e "\n${YELLOW}[2/4] Syncing from Windows directory...${NC}"
    
    # Check if Windows directory exists
    if [[ ! -d "$WINDOWS_DIR" ]]; then
        echo -e "${RED}Error: Windows directory not found at $WINDOWS_DIR${NC}"
        exit 1
    fi
    
    # Use rsync for efficient syncing
    if command -v rsync &> /dev/null; then
        rsync -av \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='dist' \
            --exclude='data-backups' \
            --exclude='*.log' \
            --exclude='.claude' \
            --exclude='wsl-diagnostic-report-*.txt' \
            "$WINDOWS_DIR/" "$WSL_DIR/"
        echo -e "${GREEN}✓ Synced using rsync${NC}"
    else
        # Fallback to cp if rsync not available
        echo -e "${YELLOW}rsync not found, using cp...${NC}"
        cp -r \
            --preserve=timestamps \
            "$WINDOWS_DIR/server-markdown.js" \
            "$WINDOWS_DIR/mcp-server-wrapper.js" \
            "$WINDOWS_DIR/dashboard-server-bridge.js" \
            "$WINDOWS_DIR/package.json" \
            "$WINDOWS_DIR/package-lock.json" \
            "$WINDOWS_DIR/lib" \
            "$WINDOWS_DIR/src" \
            "$WINDOWS_DIR/public" \
            "$WINDOWS_DIR/scripts" \
            "$WINDOWS_DIR/documentation" \
            "$WSL_DIR/"
        echo -e "${GREEN}✓ Synced using cp${NC}"
    fi
}

# Function to update npm dependencies
update_dependencies() {
    echo -e "\n${YELLOW}[3/4] Checking npm dependencies...${NC}"
    
    # Check if package.json changed
    if git diff --name-only | grep -q "package.json"; then
        echo -e "${YELLOW}package.json changed, running npm install...${NC}"
        npm install
        echo -e "${GREEN}✓ Dependencies updated${NC}"
    else
        echo -e "${GREEN}✓ Dependencies unchanged${NC}"
    fi
}

# Function to commit sync changes
commit_sync() {
    echo -e "\n${YELLOW}[4/4] Committing sync changes...${NC}"
    
    if [[ -n $(git status --porcelain) ]]; then
        git add -A
        git commit -m "Sync from Windows: $(date +%Y-%m-%d_%H-%M-%S)" -m "🤖 Auto-synced from Windows environment" || true
        echo -e "${GREEN}✓ Changes committed${NC}"
    else
        echo -e "${GREEN}✓ No changes to commit${NC}"
    fi
}

# Function to show sync summary
show_summary() {
    echo -e "\n${BLUE}=== Sync Summary ===${NC}"
    echo -e "Windows Directory: $WINDOWS_DIR"
    echo -e "WSL Directory: $WSL_DIR"
    echo -e "Last Sync: $(date)"
    echo -e "${BLUE}====================${NC}"
    
    # Show recent commits
    echo -e "\n${YELLOW}Recent commits:${NC}"
    git log --oneline -5
    
    # Show stash if any
    if git stash list | grep -q "Auto-stash before Windows sync"; then
        echo -e "\n${YELLOW}Remember: You have stashed changes!${NC}"
        echo "Run 'git stash pop' to restore them"
    fi
}

# Main execution
main() {
    check_directory
    check_uncommitted
    sync_from_windows
    update_dependencies
    commit_sync
    show_summary
    
    echo -e "\n${GREEN}✅ Sync completed successfully!${NC}"
    echo -e "${YELLOW}WSL environment is now up-to-date with Windows${NC}"
}

# Run main function
main