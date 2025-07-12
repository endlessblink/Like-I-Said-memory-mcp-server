#!/bin/bash

# Claude Code Error Recovery Script
# Use this when Claude Code gets stuck with tool_use/tool_result errors

echo "🚨 Claude Code Error Recovery"
echo "============================="
echo ""

# Check if we're in a Claude Code session
if pgrep -f "claude-code" > /dev/null; then
    echo "📍 Claude Code session detected"
else
    echo "❌ No Claude Code session found"
    echo "   Start Claude Code first, then run this script"
    exit 1
fi

echo ""
echo "🔧 Recovery Steps:"
echo ""

echo "1. Copy and paste this recovery message into Claude Code:"
echo "   ----------------------------------------"
echo '   {
     "type": "tool_result", 
     "tool_use_id": "REPLACE_WITH_ACTUAL_ID",
     "is_error": true,
     "content": "Error: Recovery mode activated - tool sequence reset"
   }'
echo "   ----------------------------------------"
echo ""

echo "2. Then send this command:"
echo "   /reset-tools"
echo ""

echo "3. If that doesn't work, restart Claude Code:"
echo "   Ctrl+C to exit, then restart claude-code"
echo ""

echo "🛡️  Prevention: Run 'source claude-code-init.sh' before each session"
echo ""

# Create a template recovery message
cat > .claude-recovery-template.json << 'EOF'
{
  "type": "tool_result",
  "tool_use_id": "REPLACE_WITH_ACTUAL_ID", 
  "is_error": true,
  "content": "Error: Recovery mode activated - tool sequence reset"
}
EOF

echo "📝 Recovery template saved to .claude-recovery-template.json"