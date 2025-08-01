# Testing NPX Installation with Updated Version

## Option 1: Test Locally (Recommended)

### 1. Pack the current version locally
```bash
# In the project directory
npm pack
# This creates: endlessblink-like-i-said-v2-2.6.2.tgz
```

### 2. Test installation in a new directory
```bash
# Create a test directory
mkdir ~/test-like-i-said-install
cd ~/test-like-i-said-install

# Install from the local package
npx /path/to/endlessblink-like-i-said-v2-2.6.2.tgz install
```

### 3. Or test with the direct file path
```bash
# Run directly from the project directory
cd /mnt/d/APPSNospaces/like-i-said-mcp-server-v2
npx . install
```

## Option 2: Test Published Version (After Publishing)

If you publish to npm:
```bash
# Publish to npm (if you have access)
npm publish

# Then test installation
npx @endlessblink/like-i-said-v2@latest install
```

## Option 3: Install from GitHub

```bash
# Install directly from GitHub
npx github:endlessblink/Like-I-Said-memory-mcp-server install
```

## Testing the Installation

### 1. Check the Installation
After running the npx install command, check:

```bash
# For Cursor
cat ~/.cursor/mcp.json | jq '.mcpServers."like-i-said-memory-v2"'

# For Windsurf
cat ~/.codeium/windsurf/mcp_config.json | jq '.mcp.servers."like-i-said-memory-v2"'
```

### 2. Verify No Dependency Errors
The installation should complete without errors about @xenova/transformers.

### 3. Test MCP Connection
Restart your IDE (Cursor/Windsurf) and check that:
- Like-I-Said MCP server appears in the MCP servers list
- All 27 tools are available
- No errors in the console about missing dependencies

## Quick Local Test Script

Create this test script to verify everything works:

```bash
#!/bin/bash
# test-local-npx.sh

echo "Testing local NPX installation..."

# Clean up any previous test
rm -rf ~/test-like-i-said-v2
mkdir -p ~/test-like-i-said-v2
cd ~/test-like-i-said-v2

# Copy the project (or use npm pack)
cp -r /mnt/d/APPSNospaces/like-i-said-mcp-server-v2/* .

# Test the CLI directly
echo "Testing CLI..."
node cli.js --version

# Test MCP server
echo "Testing MCP server..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server-markdown.js | jq '.result.tools | length'

# Test that it works without xenova
echo "Checking for dependency errors..."
node -e "
import { VectorStorage } from './lib/vector-storage.js';
const vs = new VectorStorage();
await vs.initialize();
console.log('VectorStorage status:', vs.getStatus());
"

echo "✅ Local NPX test complete!"
```

## Important Notes

1. **Version Bump**: We updated to version 2.6.2 to reflect the changes
2. **Optional Dependencies**: The @xenova/transformers in optionalDependencies means npm will try to install it but won't fail if it can't
3. **Test First**: Always test locally before publishing to npm
4. **Clean Install**: Use a fresh directory to ensure a clean test environment

## Rollback Plan

If issues occur:
```bash
# Revert to previous version
npx @endlessblink/like-i-said-v2@2.6.1 install

# Or manually edit MCP config files to point to working version
```