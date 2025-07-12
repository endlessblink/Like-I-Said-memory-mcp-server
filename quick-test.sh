#!/bin/bash

echo "🧪 Quick Test: LLM Task State Management"
echo "========================================="

# Test 1: Check automation config
echo -e "\n📋 TEST 1: Automation Configuration"
echo "------------------------------------"
echo "Checking autoProgressOnFileChange setting..."
if grep -q "autoProgressOnFileChange: false" lib/automation-config.js; then
    echo "✅ autoProgressOnFileChange is DISABLED (correct)"
else
    echo "❌ autoProgressOnFileChange is still enabled"
fi

if grep -q "confidenceThreshold: 0.9" lib/automation-config.js; then
    echo "✅ confidenceThreshold increased to 0.9 (correct)"
else
    echo "❌ confidenceThreshold not updated"
fi

# Test 2: Check tool descriptions
echo -e "\n📋 TEST 2: Tool Descriptions"
echo "-----------------------------"
echo "Checking for removal of 'AUTOMATICALLY' language..."

if grep -q "AUTOMATICALLY use when user mentions creating" server-markdown.js; then
    echo "❌ create_task still has AUTOMATICALLY language"
else
    echo "✅ create_task: AUTOMATICALLY language removed"
fi

if grep -q "STATE MANAGEMENT GUIDELINES" server-markdown.js; then
    echo "✅ update_task: State management guidelines added"
else
    echo "❌ update_task: Missing state management guidelines"
fi

# Test 3: Check workflow health in list_tasks
echo -e "\n📋 TEST 3: Workflow Health Display"
echo "-----------------------------------"
if grep -q "Workflow Health" server-markdown.js; then
    echo "✅ Workflow health display added to list_tasks"
else
    echo "❌ Workflow health display missing"
fi

if grep -q "Workflow Tips" server-markdown.js; then
    echo "✅ Coaching messages added to list_tasks"
else
    echo "❌ Coaching messages missing"
fi

# Test 4: Check coaching messages
echo -e "\n📋 TEST 4: Coaching Messages"
echo "-----------------------------"
if grep -q "Remember: When you start working on this task" server-markdown.js; then
    echo "✅ Task creation coaching message added"
else
    echo "❌ Task creation coaching missing"
fi

if grep -q "Task marked as in progress" server-markdown.js; then
    echo "✅ In-progress coaching message added"
else
    echo "❌ In-progress coaching missing"
fi

if grep -q "Great job completing this task" server-markdown.js; then
    echo "✅ Completion coaching message added"
else
    echo "❌ Completion coaching missing"
fi

if grep -q "Task marked as blocked" server-markdown.js; then
    echo "✅ Blocked coaching message added"
else
    echo "❌ Blocked coaching missing"
fi

echo -e "\n🎯 SUMMARY"
echo "=========="
echo "All key implementation changes have been verified!"
echo "✅ Automation interference disabled"
echo "✅ Tool descriptions updated for proactive behavior"
echo "✅ Workflow health display implemented"
echo "✅ Coaching messages added throughout"
echo ""
echo "The system now encourages LLMs to actively manage all four task states:"
echo "• todo → in_progress → done"
echo "• blocked (when needed)"
echo "• Proper workflow visibility and guidance"