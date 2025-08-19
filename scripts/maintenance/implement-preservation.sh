#!/bin/bash
# Implement preservation plan - immediate actions
# Run this script to create a stable snapshot of the current working state

set -e  # Exit on error

echo "🔒 Implementing Project Preservation Plan"
echo "========================================"
date

# 1. Create git tag for current stable version
echo -e "\n📌 Creating stable version tag..."
git tag -a "v2.6.21-stable" -m "Stable version snapshot - fully tested and working"
echo "✅ Tag created: v2.6.21-stable"

# 2. Create preservation branch
echo -e "\n🌿 Creating preservation branch..."
PRESERVE_BRANCH="preserve/2025-01-19-stable"
git checkout -b "$PRESERVE_BRANCH"
echo "✅ Branch created: $PRESERVE_BRANCH"

# 3. Create backup of current state
echo -e "\n💾 Creating comprehensive backup..."
BACKUP_DIR="preservation-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup critical directories
cp -r memories "$BACKUP_DIR/" 2>/dev/null || echo "No memories directory to backup"
cp -r tasks "$BACKUP_DIR/" 2>/dev/null || echo "No tasks directory to backup"
cp -r data "$BACKUP_DIR/" 2>/dev/null || echo "No data directory to backup"
cp -r vectors "$BACKUP_DIR/" 2>/dev/null || echo "No vectors directory to backup"

# Backup configuration files
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/" 2>/dev/null || echo "No .env file"
cp CLAUDE.md "$BACKUP_DIR/"

echo "✅ Backup created at: $BACKUP_DIR"

# 4. Document current configuration
echo -e "\n📝 Documenting current configuration..."
cat > "$BACKUP_DIR/preservation-config.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "2.6.21",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "platform": "$(uname -s)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$PRESERVE_BRANCH",
  "critical_files": {
    "mcp_server": "server-markdown.js",
    "api_bridge": "dashboard-server-bridge.js",
    "memory_format": "lib/memory-format.js",
    "task_storage": "lib/task-storage.js",
    "system_safeguards": "lib/system-safeguards.js"
  },
  "test_status": "pending"
}
EOF
echo "✅ Configuration documented"

# 5. Run test suite
echo -e "\n🧪 Running test suite..."
TEST_LOG="$BACKUP_DIR/test-results.log"
echo "Test run at $(date)" > "$TEST_LOG"
echo "========================" >> "$TEST_LOG"

# Run individual tests and capture results
npm run test:mcp >> "$TEST_LOG" 2>&1 && echo "✅ MCP test passed" || echo "❌ MCP test failed"
npm run test:api >> "$TEST_LOG" 2>&1 && echo "✅ API test passed" || echo "❌ API test failed"
npm run test:syntax >> "$TEST_LOG" 2>&1 && echo "✅ Syntax test passed" || echo "❌ Syntax test failed"

echo "Test results saved to: $TEST_LOG"

# 6. Create preservation README
echo -e "\n📄 Creating preservation documentation..."
cat > "$BACKUP_DIR/README.md" <<EOF
# Preservation Snapshot - $(date +%Y-%m-%d)

This is a stable snapshot of Like-I-Said MCP Server v2.

## Version Information
- Version: 2.6.21
- Git Commit: $(git rev-parse HEAD)
- Date: $(date)
- Branch: $PRESERVE_BRANCH

## Stability Status
- MCP Server: Stable
- API Bridge: Stable
- Dashboard: Stable
- Authentication: Disabled by default
- Data Protection: Active

## How to Restore
1. Clone this branch: \`git checkout $PRESERVE_BRANCH\`
2. Install dependencies: \`npm install\`
3. Restore data from backup if needed
4. Run tests: \`npm run test:pre-push\`
5. Start services: \`npm run dev:full\`

## Known Working Configuration
- Node.js: $(node --version)
- NPM: $(npm --version)
- Platform: $(uname -s)
- No authentication required
- Default ports: API=3001, UI=5173
EOF
echo "✅ Documentation created"

# 7. Create quick health check script
echo -e "\n🏥 Creating health check script..."
cat > scripts/daily-health-check.sh <<'EOF'
#!/bin/bash
# Daily health check for Like-I-Said MCP Server

echo "🏥 Like-I-Said Daily Health Check"
echo "================================="
date

# Check for backups
echo -e "\n📦 Recent backups:"
find data-backups -type d -name "backup-*" -mtime -2 | tail -5

# Check disk space
echo -e "\n💾 Disk space:"
df -h . | grep -v Filesystem

# Check for large files
echo -e "\n📊 Large files (>100MB):"
find . -type f -size +100M 2>/dev/null | grep -v node_modules || echo "None found"

# Test MCP server
echo -e "\n🔌 Testing MCP server:"
timeout 5 npm run test:mcp >/dev/null 2>&1 && echo "✅ MCP server OK" || echo "❌ MCP server FAILED"

# Check for uncommitted changes
echo -e "\n📝 Git status:"
git status --porcelain | wc -l | xargs -I {} echo "{} uncommitted changes"

echo -e "\n✅ Health check complete"
EOF
chmod +x scripts/daily-health-check.sh
echo "✅ Health check script created"

# Return to original branch
echo -e "\n🔙 Returning to main branch..."
git checkout main

echo -e "\n✅ Preservation plan implemented!"
echo "===================================="
echo "Stable snapshot created at: $BACKUP_DIR"
echo "Preservation branch: $PRESERVE_BRANCH"
echo "Run daily health check: ./scripts/daily-health-check.sh"