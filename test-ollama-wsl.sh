#!/bin/bash

echo "🔍 Testing Ollama connectivity from WSL..."
echo "=========================================="

# Get Windows host IP
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "Windows host IP: $WINDOWS_HOST"

# Test different Ollama endpoints
echo -e "\n📡 Testing Ollama endpoints..."

# Test localhost
echo -n "Testing localhost:11434... "
if curl -s -f http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "✅ Connected!"
    OLLAMA_HOST="http://localhost:11434"
else
    echo "❌ Failed"
fi

# Test Windows host IP
echo -n "Testing $WINDOWS_HOST:11434... "
if curl -s -f http://$WINDOWS_HOST:11434/api/version > /dev/null 2>&1; then
    echo "✅ Connected!"
    OLLAMA_HOST="http://$WINDOWS_HOST:11434"
    VERSION=$(curl -s http://$WINDOWS_HOST:11434/api/version | jq -r '.version' 2>/dev/null || echo "Unknown")
    echo "Ollama version: $VERSION"
else
    echo "❌ Failed"
fi

# Test host.docker.internal
echo -n "Testing host.docker.internal:11434... "
if curl -s -f http://host.docker.internal:11434/api/version > /dev/null 2>&1; then
    echo "✅ Connected!"
    OLLAMA_HOST="http://host.docker.internal:11434"
else
    echo "❌ Failed"
fi

if [ -z "$OLLAMA_HOST" ]; then
    echo -e "\n❌ Could not connect to Ollama!"
    echo -e "\n📋 To fix this:"
    echo "1. Make sure Ollama is running on Windows"
    echo "2. Set OLLAMA_HOST environment variable in Windows:"
    echo "   - Open Windows Terminal as Administrator"
    echo "   - Run: setx OLLAMA_HOST \"0.0.0.0:11434\""
    echo "3. Restart Ollama from Windows Terminal:"
    echo "   - ollama serve"
    echo "4. Try this script again"
    exit 1
fi

echo -e "\n✅ Successfully connected to Ollama at: $OLLAMA_HOST"

# List available models
echo -e "\n📦 Available models:"
MODELS=$(curl -s $OLLAMA_HOST/api/tags | jq -r '.models[]?.name' 2>/dev/null)

if [ -z "$MODELS" ]; then
    echo "No models found. Install a model using:"
    echo "ollama pull llama3.2"
else
    echo "$MODELS"
fi

# Export configuration
echo -e "\n💾 To use Ollama in your application, add this to your environment:"
echo "export OLLAMA_HOST=\"$OLLAMA_HOST\""

# Update the ollama client configuration if needed
OLLAMA_CLIENT="/home/endlessblink/projects/like-i-said-mcp-server-v2/lib/ollama-client.js"
if [ -f "$OLLAMA_CLIENT" ]; then
    echo -e "\n🔧 Updating Ollama client configuration..."
    # Check current configuration
    if grep -q "this.baseUrl = baseUrl || 'http://localhost:11434'" "$OLLAMA_CLIENT"; then
        echo "Current config uses localhost. Consider updating to use Windows host IP."
        echo "You can set OLLAMA_HOST environment variable or update the default in the client."
    fi
fi