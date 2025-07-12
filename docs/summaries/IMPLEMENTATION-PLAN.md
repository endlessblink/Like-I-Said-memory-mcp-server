# Implementation Plan: Improve LLM Task State Usage

## Overview
Based on the analysis, we'll implement changes to encourage LLMs to actively use all four task states (todo, in_progress, done, blocked).

## Changes to Implement

### 1. Update MCP Tool Descriptions (HIGH PRIORITY)

**Files to modify:**
- `server-markdown.js` - Update tool descriptions for:
  - `create_task` - Add guidance about initial state
  - `update_task` - Remove "AUTOMATICALLY", add state management guidelines
  - `list_tasks` - Add workflow health information

### 2. Disable Aggressive Automation (HIGH PRIORITY)

**Files to modify:**
- `lib/automation-config.js` - Change default settings:
  - Set `autoProgressOnFileChange: false`
  - Increase `confidenceThreshold` to 0.9
  - Add comments explaining the changes

### 3. Enhance Task Listing Output (MEDIUM PRIORITY)

**Files to modify:**
- `server-markdown.js` - In the `list_tasks` handler:
  - Add workflow health statistics
  - Include state distribution
  - Add coaching messages

### 4. Add State Transition Helpers (MEDIUM PRIORITY)

**New functionality:**
- Add helper functions to encourage state transitions
- Include reminders in task creation/update responses

### 5. Update Task Creation Flow (LOW PRIORITY)

**Files to modify:**
- `server-markdown.js` - In `create_task` handler:
  - Add reminder to mark as in_progress when starting
  - Include workflow tips in response

## Implementation Steps

### Step 1: Update Tool Descriptions
- Remove "AUTOMATICALLY" language
- Add explicit state management guidelines
- Emphasize proactive workflow management

### Step 2: Adjust Automation Settings
- Disable auto-progress on file changes
- Increase confidence thresholds
- Document why these changes improve LLM behavior

### Step 3: Enhance Output Format
- Add workflow statistics to list_tasks
- Include visual indicators for workflow health
- Add contextual coaching messages

### Step 4: Test and Iterate
- Test with sample workflows
- Verify LLMs respond to new prompts
- Adjust language as needed

## Success Criteria
- LLMs explicitly set task states when starting work
- All four states are used appropriately
- Reduced reliance on automation for state transitions
- Better workflow visibility in task listings