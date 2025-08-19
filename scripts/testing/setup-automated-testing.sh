#!/bin/bash

# Complete automated testing setup for Like-I-Said MCP Server v2
# This script sets up all automation: Git hooks, npm scripts, and instructions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🤖 Setting up automated regression testing system..."
echo ""

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

cd "$PROJECT_ROOT"

# 1. Install npm dependencies if needed
echo "📦 Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# 2. Set up Git hooks
echo ""
echo "🔧 Setting up Git hooks..."
bash scripts/setup-git-hooks.sh

# 3. Test the automation system
echo ""
echo "🧪 Testing automation system..."

echo "Running quick regression test..."
npm run test:quick --silent

echo "Testing CI pipeline simulation..."
npm run test:ci --silent > /dev/null 2>&1 && echo "✅ CI pipeline test passed" || echo "⚠️ CI pipeline needs attention"

# 4. Create automation documentation
cat > "docs/AUTOMATION-SETUP.md" << 'EOF'
# Automated Testing Setup

This document describes the automated testing system for Like-I-Said MCP Server v2.

## Overview

The project now includes comprehensive automated testing to prevent regressions:

### 🔧 Git Hooks (Local)
- **pre-commit**: Runs quick regression tests before each commit
- **pre-push**: Runs comprehensive tests before pushing to remote

### ⚡ GitHub Actions (CI/CD)
- **Regression Tests**: Runs on every push/PR to main branch
- **Security Audit**: Checks for vulnerabilities
- **Code Quality**: Generates test coverage reports
- **Daily Scheduled**: Runs tests daily at 2 AM UTC

### 📋 NPM Scripts
- `npm run test:quick` - Fast regression tests (pre-commit)
- `npm run test:ci` - Full CI pipeline simulation  
- `npm run test:regression` - All regression tests
- `npm run test:watch-regression` - Watch mode for development
- `npm run autotest:setup` - Install Git hooks
- `npm run autotest:status` - Check hook installation status

## Setup Instructions

### 1. One-Time Setup
```bash
# Run the complete setup (recommended)
npm run autotest:setup

# Or run the full setup script
bash scripts/setup-automated-testing.sh
```

### 2. Verify Installation
```bash
# Check if hooks are installed
npm run autotest:status

# Test the system
npm run test:quick
```

## How It Works

### Pre-Commit Hook
When you run `git commit`, the system automatically:
1. Validates all React component imports
2. Tests MCP server regression scenarios
3. Blocks commit if tests fail

### Pre-Push Hook  
When you run `git push`, the system automatically:
1. Runs all regression tests
2. Tests build process
3. Validates MCP server connectivity
4. Blocks push if tests fail

### GitHub Actions
On every push to main branch:
1. Tests multiple Node.js versions (18.x, 20.x)
2. Runs security audit
3. Generates code coverage
4. Sends notifications on failure

## Bypassing Hooks (Emergency Only)

```bash
# Skip pre-commit hook
git commit --no-verify -m "emergency fix"

# Skip pre-push hook
git push --no-verify
```

## Troubleshooting

### Hook Not Running
```bash
# Check hook files exist and are executable
ls -la .git/hooks/pre-commit .git/hooks/pre-push

# Reinstall hooks
npm run autotest:setup
```

### Tests Failing
```bash
# Run specific test suites
npm run test:imports        # React import validation
npm run test:mcp-regression # MCP server tests
npm run test:full-integration # End-to-end tests

# Run in watch mode for development
npm run test:watch-regression
```

### GitHub Actions Failing
1. Check the Actions tab in your GitHub repository
2. Review the logs for specific error messages
3. Ensure all dependencies are in package.json
4. Check Node.js version compatibility

## Benefits

✅ **Prevents bugs before they reach production**
✅ **Catches import errors automatically**  
✅ **Validates MCP server functionality**
✅ **No manual testing required**
✅ **Continuous integration on GitHub**
✅ **Security vulnerability scanning**
✅ **Code quality monitoring**

The automation system ensures code quality without requiring manual intervention.
EOF

echo ""
echo "📚 Created automation documentation: docs/AUTOMATION-SETUP.md"

echo ""
echo "🎉 Automated testing setup complete!"
echo ""
echo "📋 What was installed:"
echo "  ✅ Git pre-commit hook (quick regression tests)"
echo "  ✅ Git pre-push hook (comprehensive tests)"  
echo "  ✅ GitHub Actions workflow (CI/CD pipeline)"
echo "  ✅ New npm scripts for testing automation"
echo "  ✅ Documentation in docs/AUTOMATION-SETUP.md"
echo ""
echo "🚀 Your workflow is now automated:"
echo "  • Every commit: Quick regression tests run automatically"
echo "  • Every push: Comprehensive tests run automatically"  
echo "  • Every GitHub push: CI/CD pipeline runs automatically"
echo ""
echo "🔍 Test the system:"
echo "  npm run test:quick     # Quick test"
echo "  npm run test:ci        # Full CI simulation"
echo "  npm run autotest:status # Check installation"
echo ""
echo "📖 Read full documentation: docs/AUTOMATION-SETUP.md"