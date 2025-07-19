#!/bin/bash

echo "🧪 Testing NPX Installation Locally..."
echo "======================================"

# Test the CLI directly from current directory
echo -e "\n1️⃣ Testing CLI from current directory:"
node cli.js --version

echo -e "\n2️⃣ Testing MCP server (checking for dependency errors):"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server-markdown.js 2>&1 | grep -E "(tools|error|ERR_MODULE)" | head -5

echo -e "\n3️⃣ Testing VectorStorage without @xenova/transformers:"
node -e "
import { VectorStorage } from './lib/vector-storage.js';
const vs = new VectorStorage();
await vs.initialize();
const status = vs.getStatus();
console.log('✅ VectorStorage initialized successfully');
console.log('   Available:', status.available);
console.log('   Provider:', status.provider);
console.log('   Settings:', status.settings);
" 2>&1

echo -e "\n4️⃣ Testing memory operation:"
RESULT=$(echo '{"jsonrpc":"2.0","id":2,"method":"add_memory","params":{"content":"Test memory for NPX validation","tags":["test"],"project":"npx-test"}}' | node server-markdown.js 2>&1 | grep -A5 '"result"')
if [[ $RESULT == *"result"* ]]; then
    echo "✅ Memory operation successful"
else
    echo "❌ Memory operation failed"
fi

echo -e "\n5️⃣ Testing NPX install command:"
echo "To test actual NPX installation, run:"
echo "  npx . install"
echo "or"
echo "  npm pack && npx ./endlessblink-like-i-said-v2-2.6.16.tgz install"

echo -e "\n======================================"
echo "✅ Local tests complete!"