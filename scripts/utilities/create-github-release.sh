#!/bin/bash

# Create GitHub Release for v2.4.0
# Run this after authenticating with: gh auth login

echo "Creating GitHub Release v2.4.0..."

# Push the tag first
git push origin v2.4.0

# Create the release with the DXT file
gh release create v2.4.0 \
  dist-dxt-production/like-i-said-memory-v2.dxt \
  --title "🎉 v2.4.0 - Zero-Dependency Installation!" \
  --notes-file GITHUB-RELEASE-v2.4.0.md \
  --latest \
  --verify-tag

echo "Release created successfully!"
echo "Visit: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/releases/tag/v2.4.0"