# Testing the @xenova/transformers Fix

This guide shows how to thoroughly test the xenova/transformers dependency fix.

## Quick Test

Run all automated tests:
```bash
./test-all-xenova-fixes.sh
```

## Detailed Test Scenarios

### 1. Test Without @xenova/transformers Installed

This simulates the current situation where the dependency is missing:

```bash
# Ensure xenova is not installed
rm -rf node_modules/@xenova

# Test 1: MCP Server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server-markdown.js

# Test 2: Dashboard API
node dashboard-server-bridge.js
# In another terminal:
curl http://localhost:3001/api/status

# Test 3: Integration tests
node tests/test-xenova-integration.js
```

### 2. Test Feature Flags

```bash
# Test disabling semantic search
node -e "
import { settingsManager } from './lib/settings-manager.js';
import { VectorStorage } from './lib/vector-storage.js';

// Disable semantic search
settingsManager.updateSetting('features.enableSemanticSearch', false);

const vs = new VectorStorage();
await vs.initialize();
console.log('Status:', vs.getStatus());
"

# Test blocking on Windows
node -e "
import { settingsManager } from './lib/settings-manager.js';
settingsManager.updateSetting('features.blockXenovaOnWindows', true);
console.log('Settings updated');
"
```

### 3. Test Memory Operations Without Vector Storage

```bash
# Create a test memory
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "add_memory",
  "params": {
    "content": "Test memory without vector storage",
    "tags": ["test"],
    "project": "test-project"
  }
}' | node server-markdown.js

# Search memories (should use keyword search)
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "search_memories",
  "params": {
    "query": "test memory"
  }
}' | node server-markdown.js
```

### 4. Test With @xenova/transformers Installed

If you want to test with the dependency installed:

```bash
# Install just the optional dependency
npm install @xenova/transformers --no-save

# Run tests again
./test-all-xenova-fixes.sh

# Check that vector storage is now available
node -e "
import { VectorStorage } from './lib/vector-storage.js';
const vs = new VectorStorage();
await vs.initialize();
console.log('Status:', vs.getStatus());
"
```

### 5. Test Platform Blocking (Windows Only)

```bash
# On Windows, test blocking
$env:BLOCK_XENOVA_ON_WINDOWS = "true"
node tests/test-xenova-integration.js
```

## Expected Results

### ✅ Without @xenova/transformers:
- MCP server starts and lists all 27 tools
- Dashboard API server starts without errors
- Memory/task operations work using keyword search
- No ERR_MODULE_NOT_FOUND errors
- VectorStorage shows `available: false, provider: 'none'`

### ✅ With @xenova/transformers:
- All above functionality still works
- VectorStorage shows `available: true, provider: 'xenova'`
- Semantic search is available for enhanced memory/task linking

### ✅ Feature Flags:
- Setting `enableSemanticSearch: false` disables vector storage
- Setting `semanticSearchProvider: 'none'` disables vector storage
- Setting `blockXenovaOnWindows: true` blocks on Windows platform

## Debugging

Check current status:
```bash
node -e "
import { VectorStorage } from './lib/vector-storage.js';
import { optionalImport, getImportStats } from './lib/optional-import.js';
import { settingsManager } from './lib/settings-manager.js';

console.log('Settings:', settingsManager.getSettingsInfo());
console.log('Import stats:', getImportStats());

const vs = new VectorStorage();
await vs.initialize();
console.log('VectorStorage status:', vs.getStatus());
"
```

## Clean Test Environment

To ensure a clean test:
```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install

# The optional dependency should not install if it fails
# Check what was installed
ls node_modules/@xenova 2>/dev/null || echo "✅ @xenova not installed (expected)"
```