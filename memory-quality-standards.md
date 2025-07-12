# Memory Quality Standards Configuration

This file defines the quality standards for memory titles and descriptions. Edit these standards to customize quality requirements across the system.

## Title Standards

### Length Requirements
```yaml
min_length: 15
max_length: 80
optimal_min: 20
optimal_max: 60
```

### Required Elements
- **must_have_action**: true - Title must start with or contain an action word
- **must_have_subject**: true - Title must specify what component/feature
- **must_be_specific**: true - No generic or vague descriptions
- **proper_capitalization**: true - Title case or sentence case

### Strong Action Words
```yaml
strong_actions:
  - implement
  - fix
  - add
  - create
  - configure
  - optimize
  - refactor
  - integrate
  - migrate
  - deploy
  - automate
  - establish
  - resolve
  - develop
  - design
  - build
  - enhance
  - debug
  - analyze
  - document
```

### Weak Words to Avoid
```yaml
weak_words:
  - improvements
  - session
  - update
  - status
  - progress
  - changes
  - modifications
  - enhancements
  - work
  - stuff
  - things
  - various
  - multiple
  - general
  - overall
  - complete
  - major
  - minor
```

### Forbidden Patterns
```yaml
forbidden_patterns:
  - pattern: "^dashboard improvements?"
    description: "Too generic - specify what was improved"
  - pattern: "session\\s*\\("
    description: "Remove 'session' references"
  - pattern: "\\(\\s*\\w+\\s+\\d{1,2},?\\s+\\d{4}\\s*\\)"
    description: "Remove dates from titles"
  - pattern: "^(major|complete|comprehensive)\\s+"
    description: "Avoid vague magnitude descriptors"
  - pattern: "^(session|meeting|call|discussion)"
    description: "Focus on what was done, not meeting type"
  - pattern: "^(status|update|progress)\\s+"
    description: "Be specific about what changed"
  - pattern: "\\.\\.\\.+"
    description: "No truncation - use complete titles"
  - pattern: "^-----"
    description: "No formatting characters"
  - pattern: "^id-\\d+"
    description: "No ID-based titles"
```

### Good Title Examples
```yaml
good_examples:
  - title: "Implement WebSocket real-time memory synchronization"
    why: "Clear action (implement) + specific feature (WebSocket memory sync)"
  - title: "Fix React Flow node positioning calculation bug"
    why: "Specific action (fix) + component (React Flow) + precise issue"
  - title: "Add Docker environment configuration for dashboard"
    why: "Action (add) + technology (Docker) + specific purpose"
  - title: "Configure Claude Code MCP integration for WSL environment"
    why: "Action (configure) + specific tools + context"
  - title: "Refactor memory storage to use project-based organization"
    why: "Action (refactor) + component + specific improvement"
```

### Bad Title Examples
```yaml
bad_examples:
  - title: "Dashboard Improvements Session (June 16, 2025)"
    issues: ["Generic word 'improvements'", "Contains 'session'", "Has date"]
  - title: "Major UI/UX Fixes Completed"
    issues: ["Vague 'major'", "Generic 'fixes'", "No specific components"]
  - title: "WSL Configuration Status Update"
    issues: ["'Status update' pattern", "No action word", "Too vague"]
  - title: "Complete session handoff for next"
    issues: ["Contains 'session'", "Vague 'complete'", "Unclear purpose"]
```

## Description Standards

### Length Requirements
```yaml
min_length: 50
max_length: 300
optimal_min: 80
optimal_max: 200
```

### Content Requirements
```yaml
must_have:
  - context: "What problem was being solved or goal achieved"
  - actions: "Specific steps taken or changes made"
  - technical_details: "Files, technologies, or components involved"
  - outcome: "Result or current state (optional but recommended)"
```

### Structure Template
```yaml
recommended_structure: |
  Problem: [What issue or need was addressed]
  Solution: [What was implemented or changed]
  Technical: [Specific files/technologies/methods used]
  Result: [Outcome or current state]
```

### Technical Specificity
```yaml
should_mention:
  - file_names: "Specific files modified (e.g., App.tsx, server.js)"
  - technologies: "Technologies used (React, Node.js, Docker, etc.)"
  - components: "Specific components or modules affected"
  - methods: "Functions, APIs, or methods implemented"
```

### Forbidden Phrases
```yaml
forbidden_phrases:
  - "various things"
  - "different stuff" 
  - "multiple improvements"
  - "general enhancements"
  - "overall progress"
  - "status update"
  - "session complete"
  - "work done"
  - "fixes applied"
  - "changes made"
```

### Good Description Examples
```yaml
good_examples:
  - description: "Fixed WebSocket connection dropping by implementing reconnection logic in dashboard-server-bridge.js. Added exponential backoff and connection state management."
    why: "Specific problem + solution + file name + technical approach"
  - description: "Implemented project-based memory organization using subdirectories in memories/. Modified MemoryStorage class to handle project context."
    why: "Clear feature + implementation detail + specific class affected"
```

### Bad Description Examples
```yaml
bad_examples:
  - description: "Made various improvements to the dashboard UI and fixed some bugs."
    issues: ["Too vague", "No specifics", "Generic phrases"]
  - description: "Session complete. All tasks done."
    issues: ["No technical detail", "Generic statements", "No context"]
```

## Quality Scoring Weights

```yaml
scoring_weights:
  title:
    weight: 0.4  # 40% of total score
    components:
      specificity: 0.35
      action_word: 0.25
      length: 0.20
      clarity: 0.20
  
  description:
    weight: 0.4  # 40% of total score
    components:
      technical_detail: 0.30
      completeness: 0.25
      structure: 0.25
      length: 0.20
  
  metadata:
    weight: 0.2  # 20% of total score
    components:
      required_fields: 0.50
      field_validity: 0.30
      completeness: 0.20
```

## Compliance Thresholds

```yaml
thresholds:
  excellent: 90    # 90-100 score
  good: 70        # 70-89 score
  fair: 60        # 60-69 score
  poor: 40        # 40-59 score
  critical: 0     # 0-39 score
  
  passing_score: 70  # Minimum score to meet standards
  target_compliance: 85  # Target percentage of memories meeting standards
```

## Validation Rules

```yaml
validation:
  strict_mode: true  # Enforce all rules strictly
  
  auto_fix:
    remove_dates: true
    remove_session_words: true
    add_action_words: true
    fix_capitalization: true
    remove_forbidden_patterns: true
  
  manual_review_required:
    - "Titles scoring below 40"
    - "Descriptions with no technical details"
    - "Memories with critical quality issues"
```

## Dashboard Integration

```yaml
dashboard_features:
  show_quality_score: true
  show_compliance_badge: true
  highlight_issues: true
  suggest_improvements: true
  
  quality_indicators:
    excellent: "🟢"
    good: "🟡" 
    poor: "🔴"
    
  sort_by_quality: true
  filter_by_compliance: true
```

---

**Note**: This configuration file is used by:
- Quality analysis scripts (`scripts/analyze-memory-quality.cjs`)
- Automated fixing tools (`scripts/fix-memory-standards.cjs`)
- Dashboard quality display components
- Memory creation validation

Edit this file to customize quality standards across the entire system.