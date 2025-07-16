# Fix for Maya's Installation Issue

## The Problem
NPX is using a cached old version (v2.5) instead of the latest v2.6.3.

## Solution

### Option 1: Clear NPX Cache and Install (Recommended)
```bash
# Clear the NPX cache
npm cache clean --force

# Install with specific version
npx --no-cache @endlessblink/like-i-said-v2@2.6.3 like-i-said-v2 install
```

### Option 2: Install Globally First
```bash
# Install globally
npm install -g @endlessblink/like-i-said-v2@2.6.3

# Then run the installer
like-i-said-v2 install
```

### Option 3: Force Fresh Download
```bash
# Remove any cached versions
npm uninstall -g @endlessblink/like-i-said-v2

# Clear cache
npm cache clean --force

# Install fresh
npx @endlessblink/like-i-said-v2@2.6.3 like-i-said-v2 install
```

## After Installation
1. The installer should show "Like-I-Said Memory MCP Server v2.6.3" (not v2.5)
2. Choose option 1 for auto-setup
3. Restart Claude Desktop
4. Test with: "What MCP tools do you have available?"

## If Still Having Issues
Check the log file mentioned in the error:
`C:\Users\User\AppData\Local\npm-cache\_logs\[timestamp].log`

This will show what went wrong.