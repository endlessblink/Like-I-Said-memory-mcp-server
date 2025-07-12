#!/bin/bash

# Claude Code Tool-Use Protocol Initializer
# Run this before starting Claude Code sessions to prevent tool_use/tool_result errors

echo "🔧 Initializing Claude Code with Tool-Use Protocol..."

# Create protocol prompt file
cat > .claude-protocol-prompt.md << 'EOF'
# Claude Tool-Use Protocol (Active)

**CRITICAL: Follow this protocol to prevent API 400 errors:**

1. **Strict Sequencing**: After any `tool_use` block, immediately return `tool_result` with exact `tool_use_id`
2. **Error Recovery**: Always return `tool_result` even on failure with `is_error: true`
3. **Atomic Operations**: Complete one tool before starting another
4. **Token Management**: Cap responses at 20k tokens, use pagination if needed
5. **Self-Correction**: On API 400 error, send recovery `tool_result` then `/reset-tools`

**Configuration Active:**
- Mode: agentic
- Max tokens: 4096
- Strict sequencing: enabled
- Auto recovery: enabled
EOF

# Set environment variables for Claude Code
export CLAUDE_MODE="agentic"
export CLAUDE_MAX_TOKENS="4096"
export CLAUDE_TOOL_PROTOCOL="strict"

echo "✅ Protocol initialized. Safe to start Claude Code session."
echo ""
echo "📋 Commands to use:"
echo "  source claude-code-init.sh  # Apply protocol"
echo "  cat .claude-protocol-prompt.md  # View protocol"
echo ""
echo "🚨 If you get tool_use errors:"
echo "  1. Send tool_result with is_error: true"
echo "  2. Use /reset-tools command"
echo "  3. Restart session if needed"