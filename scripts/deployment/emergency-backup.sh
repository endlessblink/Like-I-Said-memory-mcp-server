#!/bin/bash
set -e

# Emergency Backup Script - Before System Restoration
# Creates complete backup of current broken state for rollback capability

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_ROOT="/mnt/d/APPSNospaces/like-i-said-mcp"
BACKUP_DIR="$PROJECT_ROOT/emergency-backups/pre_restoration_$TIMESTAMP"

echo "🚨 EMERGENCY BACKUP STARTING..."
echo "📅 Timestamp: $TIMESTAMP"
echo "📂 Backup location: $BACKUP_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup critical directories
echo "📁 Backing up memories directory..."
cp -r "$PROJECT_ROOT/memories" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No memories directory found"

echo "📁 Backing up tasks directory..."
cp -r "$PROJECT_ROOT/tasks" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No tasks directory found"

# Backup configuration files
echo "⚙️  Backing up configuration files..."
cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No package.json found"
cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No .env found"
cp "$PROJECT_ROOT/server-unified.js" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No server-unified.js found"
cp "$PROJECT_ROOT/dashboard-server-bridge.js" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  No dashboard-server-bridge.js found"

# Create restoration instructions
cat > "$BACKUP_DIR/RESTORE_INSTRUCTIONS.md" << 'EOF'
# Emergency Restore Instructions

To restore from this backup:

```bash
# 1. Stop any running servers
pkill -f "server-unified"
pkill -f "dashboard-server"

# 2. Remove current directories
rm -rf /mnt/d/APPSNospaces/like-i-said-mcp/memories
rm -rf /mnt/d/APPSNospaces/like-i-said-mcp/tasks

# 3. Restore from backup
cp -r ./memories /mnt/d/APPSNospaces/like-i-said-mcp/
cp -r ./tasks /mnt/d/APPSNospaces/like-i-said-mcp/

# 4. Restart servers
cd /mnt/d/APPSNospaces/like-i-said-mcp
npm run dashboard:unified
```

**Backup created:** $(date)
**From state:** Current broken nested structure before restoration
EOF

# Count files for verification
MEMORY_COUNT=$(find "$BACKUP_DIR/memories" -name "*.md" 2>/dev/null | wc -l)
TASK_COUNT=$(find "$BACKUP_DIR/tasks" -name "*.md" -o -name "*.json" 2>/dev/null | wc -l)

echo ""
echo "✅ EMERGENCY BACKUP COMPLETE"
echo "📊 Backed up:"
echo "   - Memory files: $MEMORY_COUNT"
echo "   - Task files: $TASK_COUNT"
echo "   - Location: $BACKUP_DIR"
echo ""
echo "🔄 To restore this exact state:"
echo "   bash $BACKUP_DIR/../restore-from-backup.sh $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT: This backup captures the BROKEN state"
echo "   Use this only if restoration scripts cause worse problems"

# Create quick restore script
cat > "$PROJECT_ROOT/emergency-backups/restore-from-backup.sh" << 'EOF'
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_directory>"
  echo "Available backups:"
  ls -la /mnt/d/APPSNospaces/like-i-said-mcp/emergency-backups/
  exit 1
fi

BACKUP_DIR="$1"
PROJECT_ROOT="/mnt/d/APPSNospaces/like-i-said-mcp"

echo "🚨 EMERGENCY RESTORE FROM: $BACKUP_DIR"

# Stop servers
echo "🛑 Stopping servers..."
pkill -f "server-unified" 2>/dev/null || true
pkill -f "dashboard-server" 2>/dev/null || true
sleep 2

# Create emergency backup of current state
EMERGENCY_TIME=$(date +"%Y%m%d_%H%M%S")
echo "📦 Creating emergency backup of current state..."
mkdir -p "$PROJECT_ROOT/emergency-backups/pre_restore_$EMERGENCY_TIME"
cp -r "$PROJECT_ROOT/memories" "$PROJECT_ROOT/emergency-backups/pre_restore_$EMERGENCY_TIME/" 2>/dev/null || true
cp -r "$PROJECT_ROOT/tasks" "$PROJECT_ROOT/emergency-backups/pre_restore_$EMERGENCY_TIME/" 2>/dev/null || true

# Remove current directories
echo "🗑️  Removing current state..."
rm -rf "$PROJECT_ROOT/memories" "$PROJECT_ROOT/tasks"

# Restore from backup
echo "🔄 Restoring from backup..."
cp -r "$BACKUP_DIR/memories" "$PROJECT_ROOT/"
cp -r "$BACKUP_DIR/tasks" "$PROJECT_ROOT/"

echo "✅ RESTORE COMPLETE"
echo "🚀 Restart servers with: npm run dashboard:unified"
EOF

chmod +x "$PROJECT_ROOT/emergency-backups/restore-from-backup.sh"

echo "🛡️  Emergency backup and restore scripts created!"
echo "   Backup: $BACKUP_DIR"
echo "   Restore: $PROJECT_ROOT/emergency-backups/restore-from-backup.sh"