#!/bin/bash

# Setup Git hooks for automated regression testing
# This script sets up pre-commit and pre-push hooks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "🔧 Setting up Git hooks for automated regression testing..."

# Ensure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook for Like-I-Said MCP Server v2
# Runs quick regression tests before each commit

set -e

echo "🧪 Running pre-commit regression tests..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Run quick regression tests (skip slow integration tests)
echo "📋 Running import validation tests..."
npm run test:imports --silent

echo "🔍 Running MCP server regression tests..."
npm run test:mcp-regression --silent

echo "✅ Pre-commit tests passed!"
EOF

# Create pre-push hook
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash

# Pre-push hook for Like-I-Said MCP Server v2
# Runs comprehensive regression tests before pushing

set -e

echo "🧪 Running pre-push comprehensive tests..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

# Run all regression tests
echo "📋 Running all regression tests..."
npm run test:regression --silent

echo "🏗️ Testing build process..."
npm run build --silent

echo "🔍 Running MCP server connectivity test..."
npm run test:mcp --silent

echo "✅ All pre-push tests passed!"
EOF

# Make hooks executable
chmod +x "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git hooks installed successfully!"
echo ""
echo "📋 Installed hooks:"
echo "  - pre-commit: Runs quick regression tests"
echo "  - pre-push: Runs comprehensive tests and build"
echo ""
echo "🔧 To disable hooks temporarily:"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
echo "🗑️ To remove hooks:"
echo "  rm $HOOKS_DIR/pre-commit"
echo "  rm $HOOKS_DIR/pre-push"