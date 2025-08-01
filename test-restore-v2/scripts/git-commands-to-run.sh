#!/bin/bash

# Run these commands in your Like-I-Said-memory-mcp-server git repository

# 1. First, copy the updated files to your git repository if needed
# cp -r /mnt/d/APPSNospaces/like-i-said-mcp-server-v2/* /path/to/your/Like-I-Said-memory-mcp-server/

# 2. Navigate to your git repository
# cd /path/to/your/Like-I-Said-memory-mcp-server

# 3. Check what files have changed
git status

# 4. Stage all changes
git add -A

# 5. Commit with descriptive message
git commit -m "fix: Safe reintroduction of @xenova/transformers as optional dependency

- Moved @xenova/transformers to optionalDependencies in package.json
- Created lib/optional-import.js for safe dynamic imports
- Updated lib/vector-storage.js to use dynamic imports with fallback
- Added semantic search feature flags to settings-manager.js  
- Updated lib/task-discovery.js for graceful handling
- Created comprehensive tests for xenova integration
- Bumped version to 2.6.16

This fix prevents installation failures when @xenova/transformers cannot be installed
while maintaining full functionality through keyword-based search."

# 6. Push to GitHub
git push origin main

# 7. Publish to npm (make sure you're logged in with npm login first)
npm publish

# 8. After 1-2 minutes, test the installation
echo "Wait 1-2 minutes for npm to update, then run:"
echo "npx @endlessblink/like-i-said-v2@latest install"