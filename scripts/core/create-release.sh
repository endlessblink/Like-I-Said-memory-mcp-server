#!/bin/bash

# Create Release Package for Like-I-Said MCP Server v2
# This script builds and packages the dashboard for release

set -e

echo "🚀 Creating Like-I-Said v2.6.8 Release Package"
echo "============================================"

# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")
RELEASE_NAME="like-i-said-v${VERSION}"
RELEASE_DIR="releases/${RELEASE_NAME}"

# Clean up any previous release
rm -rf releases
mkdir -p ${RELEASE_DIR}

echo "📦 Building Dashboard..."
npm run build

echo "📁 Creating release structure..."

# Copy essential files
cp -r dist ${RELEASE_DIR}/
cp -r lib ${RELEASE_DIR}/
cp -r src ${RELEASE_DIR}/
cp *.js ${RELEASE_DIR}/
cp *.json ${RELEASE_DIR}/
cp *.md ${RELEASE_DIR}/
cp .nvmrc ${RELEASE_DIR}/ 2>/dev/null || true

# Create empty directories
mkdir -p ${RELEASE_DIR}/memories
mkdir -p ${RELEASE_DIR}/tasks
mkdir -p ${RELEASE_DIR}/data
mkdir -p ${RELEASE_DIR}/data-backups

# Create .gitignore for user data
cat > ${RELEASE_DIR}/.gitignore << EOF
# User data
memories/*
!memories/.gitkeep
tasks/*
!tasks/.gitkeep
data/*
!data/.gitkeep
data-backups/*
!data-backups/.gitkeep
.dashboard-port
*.log
node_modules/
.env
EOF

# Create .gitkeep files
touch ${RELEASE_DIR}/memories/.gitkeep
touch ${RELEASE_DIR}/tasks/.gitkeep
touch ${RELEASE_DIR}/data/.gitkeep
touch ${RELEASE_DIR}/data-backups/.gitkeep

# Create quick start script for Windows
cat > ${RELEASE_DIR}/start-dashboard.bat << EOF
@echo off
echo Starting Like-I-Said Dashboard...
call npm install --production
call npm run dev:full
pause
EOF

# Create quick start script for Unix
cat > ${RELEASE_DIR}/start-dashboard.sh << EOF
#!/bin/bash
echo "Starting Like-I-Said Dashboard..."
npm install --production
npm run dev:full
EOF
chmod +x ${RELEASE_DIR}/start-dashboard.sh

# Create installation instructions
cat > ${RELEASE_DIR}/QUICK_START.md << EOF
# Like-I-Said Quick Start

## 1. Install Dependencies
\`\`\`bash
npm install --production
\`\`\`

## 2. Start Dashboard
### Windows
Double-click \`start-dashboard.bat\`

### Mac/Linux
\`\`\`bash
./start-dashboard.sh
\`\`\`

## 3. Open Dashboard
Navigate to http://localhost:5173

## Need Help?
See DASHBOARD-INSTALLATION-GUIDE.md for detailed instructions.
EOF

echo "📦 Creating ZIP archive..."
cd releases
zip -r ${RELEASE_NAME}.zip ${RELEASE_NAME}

# Create tar.gz for Unix users
tar -czf ${RELEASE_NAME}.tar.gz ${RELEASE_NAME}

# Calculate checksums
echo "🔐 Calculating checksums..."
sha256sum ${RELEASE_NAME}.zip > ${RELEASE_NAME}.zip.sha256
sha256sum ${RELEASE_NAME}.tar.gz > ${RELEASE_NAME}.tar.gz.sha256

# Create release info
cat > release-info.json << EOF
{
  "version": "${VERSION}",
  "name": "${RELEASE_NAME}",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "files": [
    {
      "name": "${RELEASE_NAME}.zip",
      "size": $(stat -f%z ${RELEASE_NAME}.zip 2>/dev/null || stat -c%s ${RELEASE_NAME}.zip),
      "sha256": "$(sha256sum ${RELEASE_NAME}.zip | cut -d' ' -f1)"
    },
    {
      "name": "${RELEASE_NAME}.tar.gz",
      "size": $(stat -f%z ${RELEASE_NAME}.tar.gz 2>/dev/null || stat -c%s ${RELEASE_NAME}.tar.gz),
      "sha256": "$(sha256sum ${RELEASE_NAME}.tar.gz | cut -d' ' -f1)"
    }
  ]
}
EOF

cd ..

echo ""
echo "✅ Release package created successfully!"
echo ""
echo "📦 Release files:"
echo "  - releases/${RELEASE_NAME}.zip (Windows)"
echo "  - releases/${RELEASE_NAME}.tar.gz (Mac/Linux)"
echo ""
echo "📝 Release notes: RELEASE-NOTES-v${VERSION}.md"
echo "📚 Installation guide: DASHBOARD-INSTALLATION-GUIDE.md"
echo ""
echo "🚀 Ready to upload to GitHub Releases!"