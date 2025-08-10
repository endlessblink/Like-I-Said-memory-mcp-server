#!/bin/bash

echo "🔄 Like-I-Said v2 Backup Restoration Tool"
echo ""

# Check arguments
if [ $# -lt 1 ]; then
    echo "❌ Error: Please provide a backup file path"
    echo ""
    echo "Usage: ./restore-backup.sh <backup-file> [target-directory]"
    echo "Example: ./restore-backup.sh backups/like-i-said-v2-backup-20250801-000350.tar.gz restored-v2"
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DIR="${2:-restored-v2}"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if target directory already exists
if [ -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory already exists: $TARGET_DIR"
    echo "Please remove it or choose a different directory."
    exit 1
fi

echo "📦 Backup file: $BACKUP_FILE"
echo "📁 Target directory: $TARGET_DIR"
echo ""

# Create target directory
echo "1️⃣ Creating target directory..."
mkdir -p "$TARGET_DIR"

# Extract backup
echo "2️⃣ Extracting backup files..."
tar -xzf "$BACKUP_FILE" -C "$TARGET_DIR"

# Verify critical files
echo ""
echo "3️⃣ Verifying critical files..."
echo ""

CRITICAL_FILES=(
    "package.json"
    "server-markdown.js"
    "cli.js"
    "dashboard-server-bridge.js"
    "server.js"
    "README.md"
    "CLAUDE.md"
)

CRITICAL_DIRS=(
    "lib"
    "src"
    "docs"
    "scripts"
)

ALL_GOOD=true

echo "📄 Checking files:"
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$TARGET_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - MISSING"
        ALL_GOOD=false
    fi
done

echo ""
echo "📁 Checking directories:"
for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$TARGET_DIR/$dir" ]; then
        FILE_COUNT=$(find "$TARGET_DIR/$dir" -type f | wc -l)
        echo "  ✅ $dir/ ($FILE_COUNT files)"
    else
        echo "  ❌ $dir/ - MISSING"
        ALL_GOOD=false
    fi
done

# Create restoration report
REPORT_FILE="$TARGET_DIR/RESTORATION_REPORT.txt"
{
    echo "Like-I-Said v2 Restoration Report"
    echo "================================"
    echo "Date: $(date)"
    echo "Backup File: $BACKUP_FILE"
    echo "Target Directory: $TARGET_DIR"
    echo "Status: $( [ "$ALL_GOOD" = true ] && echo "SUCCESS" || echo "PARTIAL" )"
    echo ""
    echo "Next Steps:"
    echo "1. cd $TARGET_DIR"
    echo "2. npm install"
    echo "3. npm run dev:full"
} > "$REPORT_FILE"

echo ""
echo "========================================"
if [ "$ALL_GOOD" = true ]; then
    echo "✅ Restoration completed successfully!"
else
    echo "⚠️  Restoration completed with warnings"
    echo "Some files or directories are missing."
fi

echo ""
echo "Next steps:"
echo "1. cd $TARGET_DIR"
echo "2. npm install"
echo "3. npm run dev:full"
echo ""
echo "📄 Restoration report saved to: $REPORT_FILE"