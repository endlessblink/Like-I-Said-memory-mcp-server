#!/bin/bash

# Sync WSL Like-I-Said MCP Server to Windows
# This script syncs the WSL development environment to Windows

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Like-I-Said MCP Server v2 - WSL to Windows Sync ===${NC}"
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

# Function to perform git operations
git_operations() {
    echo -e "${YELLOW}[1/4] Checking git status...${NC}"
    
    # Check if there are changes
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}Found uncommitted changes${NC}"
        
        # Show status
        git status --short
        
        # Auto-commit
        echo -e "\n${YELLOW}Auto-committing changes...${NC}"
        git add -A
        
        # Generate commit message based on changed files
        CHANGED_FILES=$(git diff --cached --name-only | head -5 | paste -sd ", ")
        COMMIT_MSG="Auto-sync: Update $CHANGED_FILES"
        
        git commit -m "$COMMIT_MSG" -m "🤖 Generated with sync-to-windows.sh" || true
        echo -e "${GREEN}✓ Changes committed${NC}"
    else
        echo -e "${GREEN}✓ No uncommitted changes${NC}"
    fi
}

# Function to sync to Windows
sync_to_windows() {
    echo -e "\n${YELLOW}[2/4] Syncing to Windows directory...${NC}"
    
    # Check if Windows directory exists
    if [[ ! -d "$WINDOWS_DIR" ]]; then
        echo -e "${RED}Error: Windows directory not found at $WINDOWS_DIR${NC}"
        exit 1
    fi
    
    # Use rsync for efficient syncing
    if command -v rsync &> /dev/null; then
        rsync -av --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='dist' \
            --exclude='data-backups' \
            --exclude='*.log' \
            --exclude='.claude' \
            --exclude='wsl-diagnostic-report-*.txt' \
            "$WSL_DIR/" "$WINDOWS_DIR/"
        echo -e "${GREEN}✓ Synced using rsync${NC}"
    else
        # Fallback to cp if rsync not available
        echo -e "${YELLOW}rsync not found, using cp...${NC}"
        cp -r \
            --preserve=timestamps \
            server-markdown.js \
            mcp-server-wrapper.js \
            dashboard-server-bridge.js \
            package.json \
            package-lock.json \
            lib \
            src \
            public \
            scripts \
            documentation \
            "$WINDOWS_DIR/"
        echo -e "${GREEN}✓ Synced using cp${NC}"
    fi
}

# Function to update Windows git
update_windows_git() {
    echo -e "\n${YELLOW}[3/4] Updating Windows git repository...${NC}"
    
    cd "$WINDOWS_DIR"
    
    # Check git status in Windows directory
    if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
        git add -A
        git commit -m "Sync from WSL: $(date +%Y-%m-%d_%H-%M-%S)" -m "🤖 Auto-synced from WSL environment" || true
        echo -e "${GREEN}✓ Windows repository updated${NC}"
    else
        echo -e "${GREEN}✓ Windows repository already up-to-date${NC}"
    fi
    
    cd "$WSL_DIR"
}

# Function to show sync summary
show_summary() {
    echo -e "\n${YELLOW}[4/4] Sync Summary${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "WSL Directory: $WSL_DIR"
    echo -e "Windows Directory: $WINDOWS_DIR"
    echo -e "Last Sync: $(date)"
    echo -e "${BLUE}================================${NC}"
    
    # Show git log
    echo -e "\n${YELLOW}Recent commits:${NC}"
    git log --oneline -5
}

# Main execution
main() {
    check_directory
    git_operations
    sync_to_windows
    update_windows_git
    show_summary
    
    echo -e "\n${GREEN}✅ Sync completed successfully!${NC}"
    echo -e "${YELLOW}Windows environment is now up-to-date with WSL${NC}"
}

# Run main function
main