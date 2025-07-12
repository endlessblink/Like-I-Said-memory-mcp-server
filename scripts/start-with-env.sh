#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "📁 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "⚠️  No .env file found"
    echo "📝 To create one:"
    echo "   1. Copy .env.example to .env"
    echo "   2. Add your GitHub token"
    echo ""
    echo "   cp .env.example .env"
    echo "   nano .env"
    exit 1
fi

# Test GitHub token
if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔑 GitHub token is set"
    # Test authentication
    USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -o '"login":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$USER" ]; then
        echo "✅ Authenticated as: $USER"
    else
        echo "❌ GitHub authentication failed - check your token"
    fi
else
    echo "❌ GitHub token not found in .env"
fi

# Start the MCP server
echo ""
echo "🚀 Starting MCP server with GitHub integration..."
node server-markdown.js