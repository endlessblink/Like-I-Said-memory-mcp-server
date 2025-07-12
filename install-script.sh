#!/bin/bash

# Like-I-Said MCP Server v2 - Zero-Dependency Installer
# This script downloads and installs the appropriate binary for the current platform

set -e

REPO_URL="https://github.com/endlessblink/like-i-said-mcp-server-v2"
RELEASES_URL="$REPO_URL/releases/latest/download"
INSTALL_DIR="$HOME/.local/bin"
BINARY_NAME="like-i-said-mcp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform
detect_platform() {
    case "$(uname -s)" in
        Linux*)
            case "$(uname -m)" in
                x86_64) PLATFORM="linux-x64" ;;
                *) echo -e "${RED}Error: Unsupported architecture $(uname -m)${NC}" && exit 1 ;;
            esac
            ;;
        Darwin*)
            case "$(uname -m)" in
                x86_64) PLATFORM="macos-x64" ;;
                arm64) PLATFORM="macos-arm64" ;;
                *) echo -e "${RED}Error: Unsupported architecture $(uname -m)${NC}" && exit 1 ;;
            esac
            ;;
        CYGWIN*|MINGW*|MSYS*)
            PLATFORM="win-x64"
            BINARY_NAME="like-i-said-mcp.exe"
            ;;
        *)
            echo -e "${RED}Error: Unsupported platform $(uname -s)${NC}"
            exit 1
            ;;
    esac
}

# Create installation directory
setup_install_dir() {
    mkdir -p "$INSTALL_DIR"
    
    # Add to PATH if not already there
    case ":$PATH:" in
        *":$INSTALL_DIR:"*) ;;
        *) 
            echo -e "${YELLOW}Adding $INSTALL_DIR to PATH...${NC}"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
            if [ -f "$HOME/.zshrc" ]; then
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
            fi
            ;;
    esac
}

# Download and install binary
install_binary() {
    local binary_url="$RELEASES_URL/mcp-server-standalone-$PLATFORM"
    if [ "$PLATFORM" = "win-x64" ]; then
        binary_url="$binary_url.exe"
    fi
    
    echo -e "${BLUE}Downloading Like-I-Said MCP Server for $PLATFORM...${NC}"
    
    if command -v curl > /dev/null; then
        curl -L -o "$INSTALL_DIR/$BINARY_NAME" "$binary_url"
    elif command -v wget > /dev/null; then
        wget -O "$INSTALL_DIR/$BINARY_NAME" "$binary_url"
    else
        echo -e "${RED}Error: curl or wget is required${NC}"
        exit 1
    fi
    
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
    echo -e "${GREEN}Binary installed to $INSTALL_DIR/$BINARY_NAME${NC}"
}

# Detect MCP clients and configure them
configure_mcp_clients() {
    echo -e "${BLUE}Configuring MCP clients...${NC}"
    
    # Claude Desktop
    configure_claude_desktop
    
    # Cursor
    configure_cursor
    
    # Claude Code (if in WSL)
    if grep -q Microsoft /proc/version 2>/dev/null; then
        configure_claude_code_wsl
    fi
}

configure_claude_desktop() {
    local config_dir
    case "$PLATFORM" in
        macos-*)
            config_dir="$HOME/Library/Application Support/Claude"
            ;;
        win-*)
            config_dir="$APPDATA/Claude"
            ;;
        linux-*)
            config_dir="$HOME/.config/Claude"
            ;;
    esac
    
    if [ -d "$config_dir" ]; then
        local config_file="$config_dir/claude_desktop_config.json"
        echo -e "${YELLOW}Configuring Claude Desktop...${NC}"
        
        # Backup existing config
        if [ -f "$config_file" ]; then
            cp "$config_file" "$config_file.backup.$(date +%s)"
        fi
        
        # Create new config
        cat > "$config_file" << EOF
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "$INSTALL_DIR/$BINARY_NAME",
      "args": [],
      "env": {}
    }
  }
}
EOF
        echo -e "${GREEN}Claude Desktop configured${NC}"
    else
        echo -e "${YELLOW}Claude Desktop not found - you can configure it manually${NC}"
    fi
}

configure_cursor() {
    local config_file="$HOME/.cursor/mcp.json"
    local config_dir="$(dirname "$config_file")"
    
    if [ -d "$HOME/.cursor" ]; then
        echo -e "${YELLOW}Configuring Cursor...${NC}"
        mkdir -p "$config_dir"
        
        # Backup existing config
        if [ -f "$config_file" ]; then
            cp "$config_file" "$config_file.backup.$(date +%s)"
        fi
        
        # Create new config
        cat > "$config_file" << EOF
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "$INSTALL_DIR/$BINARY_NAME",
      "args": []
    }
  }
}
EOF
        echo -e "${GREEN}Cursor configured${NC}"
    else
        echo -e "${YELLOW}Cursor not found - you can configure it manually${NC}"
    fi
}

configure_claude_code_wsl() {
    echo -e "${YELLOW}Configuring Claude Code for WSL...${NC}"
    
    # Convert WSL path to Windows path
    local windows_path
    windows_path=$(wslpath -w "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || echo "$INSTALL_DIR/$BINARY_NAME")
    
    cat > "$HOME/.claude-code-mcp.json" << EOF
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "$windows_path",
      "args": [],
      "env": {}
    }
  }
}
EOF
    echo -e "${GREEN}Claude Code WSL configuration created${NC}"
    echo -e "${BLUE}Copy the contents of ~/.claude-code-mcp.json to your Claude Code settings${NC}"
}

# Test installation
test_installation() {
    echo -e "${BLUE}Testing installation...${NC}"
    
    if echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | timeout 5s "$INSTALL_DIR/$BINARY_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Installation successful!${NC}"
        echo -e "${GREEN}✅ MCP Server is working correctly${NC}"
    else
        echo -e "${RED}❌ Installation test failed${NC}"
        echo -e "${YELLOW}The binary was installed but may have runtime issues${NC}"
    fi
}

# Main installation flow
main() {
    echo -e "${BLUE}Like-I-Said MCP Server v2 - Zero-Dependency Installer${NC}"
    echo ""
    
    detect_platform
    echo -e "${GREEN}Detected platform: $PLATFORM${NC}"
    
    setup_install_dir
    install_binary
    configure_mcp_clients
    test_installation
    
    echo ""
    echo -e "${GREEN}🎉 Installation complete!${NC}"
    echo -e "${BLUE}The Like-I-Said MCP Server is now ready to use with:${NC}"
    echo -e "  • Claude Desktop"
    echo -e "  • Cursor"
    echo -e "  • Claude Code (if in WSL)"
    echo ""
    echo -e "${YELLOW}You may need to restart your MCP clients for the changes to take effect.${NC}"
    echo ""
    echo -e "${BLUE}For manual configuration, use: $INSTALL_DIR/$BINARY_NAME${NC}"
}

# Run installer
main "$@"