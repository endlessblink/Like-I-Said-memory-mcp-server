#!/bin/bash

# Create V2 Backup Script
# This script creates a comprehensive backup of the Like-I-Said v2 project

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups"
BACKUP_NAME="like-i-said-v2-full-backup-${TIMESTAMP}"

echo "🔄 Creating comprehensive backup of Like-I-Said v2..."

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create a temporary directory for organizing the backup
TEMP_BACKUP="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p "${TEMP_BACKUP}"

# Copy source code
echo "📁 Copying source code..."
cp -r src "${TEMP_BACKUP}/"
cp -r lib "${TEMP_BACKUP}/"
cp -r scripts "${TEMP_BACKUP}/"
cp -r tests "${TEMP_BACKUP}/" 2>/dev/null || echo "No tests directory"

# Copy configuration files
echo "⚙️ Copying configuration files..."
cp package.json "${TEMP_BACKUP}/"
cp package-lock.json "${TEMP_BACKUP}/"
cp vite.config.ts "${TEMP_BACKUP}/"
cp tsconfig.json "${TEMP_BACKUP}/"
cp tailwind.config.js "${TEMP_BACKUP}/"
cp postcss.config.js "${TEMP_BACKUP}/"
cp .gitignore "${TEMP_BACKUP}/"
cp .npmignore "${TEMP_BACKUP}/"

# Copy root scripts
echo "🔧 Copying root scripts..."
cp server-markdown.js "${TEMP_BACKUP}/"
cp server.js "${TEMP_BACKUP}/"
cp dashboard-server-bridge.js "${TEMP_BACKUP}/"
cp cli.js "${TEMP_BACKUP}/"
cp mcp-server-wrapper.js "${TEMP_BACKUP}/" 2>/dev/null || true

# Copy documentation
echo "📚 Copying documentation..."
cp -r docs "${TEMP_BACKUP}/"
cp README.md "${TEMP_BACKUP}/"
cp CLAUDE.md "${TEMP_BACKUP}/"

# Copy HTML files
echo "🌐 Copying HTML files..."
cp index.html "${TEMP_BACKUP}/"
cp task-memory-visualization.html "${TEMP_BACKUP}/" 2>/dev/null || true

# Copy sample data (limited)
echo "💾 Copying sample data..."
mkdir -p "${TEMP_BACKUP}/memories/default"
mkdir -p "${TEMP_BACKUP}/tasks/default"
# Copy only a few sample files to keep backup size reasonable
find memories -name "*.md" | head -10 | while read file; do
    cp "$file" "${TEMP_BACKUP}/memories/default/" 2>/dev/null || true
done
find tasks -name "*.md" | head -10 | while read file; do
    cp "$file" "${TEMP_BACKUP}/tasks/default/" 2>/dev/null || true
done

# Create backup info file
echo "📝 Creating backup info..."
cat > "${TEMP_BACKUP}/BACKUP_INFO.txt" << EOF
Like-I-Said MCP Server v2 Backup
================================
Created: $(date)
Version: v2.3.7
Node Version: $(node --version 2>/dev/null || echo "N/A")
NPM Version: $(npm --version 2>/dev/null || echo "N/A")

Contents:
- Full source code (src/, lib/, scripts/)
- Configuration files
- Documentation
- Sample memories and tasks
- Root entry points

Not Included:
- node_modules/
- dist/ (built files)
- .git/ (version control)
- Full data directories (only samples)
- Log files

To Restore:
1. Extract this backup to a new directory
2. Run: npm install
3. Copy your data from the original project if needed
4. Run: npm run dev:full
EOF

# Create the compressed archive
echo "🗜️ Creating compressed archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"

# Remove temporary directory
rm -rf "${BACKUP_NAME}"

# Create a checksum
echo "🔐 Creating checksum..."
sha256sum "${BACKUP_NAME}.tar.gz" > "${BACKUP_NAME}.tar.gz.sha256"

# Final size report
SIZE=$(ls -lh "${BACKUP_NAME}.tar.gz" | awk '{print $5}')
echo "✅ Backup complete!"
echo "📦 File: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "📏 Size: ${SIZE}"
echo "🔐 Checksum: $(cat ${BACKUP_NAME}.tar.gz.sha256)"