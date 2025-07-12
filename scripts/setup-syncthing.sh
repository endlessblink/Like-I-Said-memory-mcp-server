#!/bin/bash
# Quick setup script for Syncthing

echo "Syncthing Setup for Like-I-Said MCP Server"
echo "=========================================="
echo ""
echo "Your Syncthing Device ID:"
syncthing cli show id
echo ""
echo "Web UI: http://localhost:8384"
echo ""
echo "To add this project folder:"
echo "1. Open http://localhost:8384 in your browser"
echo "2. Click 'Add Folder'"
echo "3. Use these settings:"
echo "   - Folder ID: like-i-said-mcp"
echo "   - Folder Path: $(pwd)"
echo ""
echo "The .stignore file has been created with proper ignore patterns."
echo ""
echo "To run Syncthing as a service:"
echo "  systemctl --user enable syncthing"
echo "  systemctl --user start syncthing"