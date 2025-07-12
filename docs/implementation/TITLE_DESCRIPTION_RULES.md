# Memory Title and Description Generation Rules

## Overview
This document defines the rules and guidelines for generating high-quality titles and descriptions for memories in the Like-I-Said MCP Server. These rules ensure consistency, clarity, and usefulness across all memory enhancements.

## Core Principles

### 1. **Clarity First**
- Titles should be immediately understandable
- Descriptions should provide context without requiring the full content
- Avoid technical jargon unless it's essential and contextually appropriate

### 2. **Conciseness**
- Titles: Maximum 50 characters
- Descriptions: Maximum 140 characters
- Every word should add value

### 3. **Specificity**
- Prefer specific terms over generic ones
- Include key identifiers (project names, technologies, specific issues)
- Avoid vague terms like "stuff", "things", "various"

### 4. **Actionability**
- For task-related content, use action-oriented language
- For informational content, focus on the knowledge contained
- For code-related content, emphasize the functionality or purpose

## Title Generation Rules

### Format Guidelines
- Use title case (capitalize first letter of major words)
- No periods at the end unless it's an abbreviation
- Use colons to separate main topic from subtopic
- Avoid special characters except hyphens and colons

### Content-Specific Rules

#### **Code & Programming**
- **Format**: `[Technology] [Component]: [Purpose/Action]`
- **Examples**:
  - `React Dashboard: Memory Card Component`
  - `Python API: User Authentication Fix`
  - `Node.js Server: Database Connection Setup`
- **Include**: Language, framework, component name, main purpose
- **Prioritize**: Function over implementation details

#### **Tasks & Project Management**
- **Format**: `[Project] [Action]: [Specific Task]`
- **Examples**:
  - `MCP Server: Add Ollama Integration`
  - `Dashboard: Fix Memory Card Display`
  - `Documentation: Update API Reference`
- **Include**: Project context, action verb, specific outcome
- **Prioritize**: Deliverables over process

#### **Research & Learning**
- **Format**: `[Topic]: [Specific Focus/Finding]`
- **Examples**:
  - `Machine Learning: Vector Embeddings Implementation`
  - `Performance: Database Query Optimization`
  - `Security: JWT Token Best Practices`
- **Include**: Domain, specific area of focus
- **Prioritize**: Key insights over general topics

#### **Conversations & Communications**
- **Format**: `[Context]: [Main Topic/Decision]`
- **Examples**:
  - `Team Meeting: Q3 Roadmap Planning`
  - `Client Call: Feature Requirements Review`
  - `Standup: Sprint 5 Blockers Discussion`
- **Include**: Communication type, key participants, main topic
- **Prioritize**: Decisions and outcomes over general discussion

#### **Documentation & Notes**
- **Format**: `[Document Type]: [Specific Subject]`
- **Examples**:
  - `Setup Guide: Local Development Environment`
  - `Meeting Notes: Architecture Decision Record`
  - `Reference: API Error Codes List`
- **Include**: Document type, specific subject matter
- **Prioritize**: Purpose over format

#### **Personal & Preferences**
- **Format**: `[Category]: [Specific Preference/Insight]`
- **Examples**:
  - `Productivity: Morning Routine Optimization`
  - `Learning: Effective Code Review Practices`
  - `Preferences: Development Tools Configuration`
- **Include**: Personal context, specific area
- **Prioritize**: Actionable insights over general thoughts

## Description Generation Rules

### Structure Guidelines
- First sentence: What is this about?
- Second sentence: Why is it important/relevant?
- Use active voice
- Include key details that aren't in the title

### Content Enhancement Rules

#### **Technical Context**
- Include version numbers, frameworks, or tools when relevant
- Mention specific technologies, libraries, or methodologies
- Reference error codes, status codes, or specific identifiers
- Include environment context (dev, staging, production)

#### **Temporal Context**
- Reference project phases, sprints, or milestones
- Include deadlines or time-sensitive information
- Mention if this is a follow-up or continuation

#### **Relationship Context**
- Reference related components, systems, or processes
- Mention dependencies or prerequisites
- Include team members or stakeholders when relevant

#### **Outcome Context**
- State the result or impact
- Include metrics or measurable outcomes
- Mention next steps or follow-up actions

### Category-Specific Description Rules

#### **Code & Programming**
```
Template: "[Technology] implementation for [purpose]. [Implementation details/impact]."
Example: "React component for memory card display. Includes drag-and-drop functionality and real-time updates."
```

#### **Tasks & Project Management**
```
Template: "[Action] to [outcome/benefit]. [Context/constraints]."
Example: "Implement Ollama integration for local AI processing. Reduces API costs and improves privacy."
```

#### **Research & Learning**
```
Template: "Investigation into [topic] revealing [key finding]. [Application/next steps]."
Example: "Analysis of vector embeddings for semantic search. Implementation planned for Q2 sprint."
```

#### **Conversations & Communications**
```
Template: "[Meeting type] covering [main topics]. [Key decisions/outcomes]."
Example: "Weekly standup discussing sprint progress. Identified blockers in authentication module."
```

#### **Documentation & Notes**
```
Template: "[Document type] detailing [subject]. [Scope/audience]."
Example: "Setup instructions for local development environment. Includes Docker configuration and database setup."
```

#### **Personal & Preferences**
```
Template: "[Personal insight/preference] regarding [area]. [Rationale/benefits]."
Example: "Preferred Git workflow for feature development. Emphasizes small commits and clear messages."
```

## Quality Assurance Rules

### Mandatory Checks
1. **Length Compliance**: Title ≤ 50 chars, Description ≤ 140 chars
2. **No Redundancy**: Title and description should not repeat information
3. **Specificity**: Avoid generic terms like "implementation", "system", "process"
4. **Completeness**: Both title and description should be self-contained
5. **Relevance**: Content should match the memory's actual purpose

### Forbidden Patterns
- **Vague Descriptors**: "various", "multiple", "different", "several"
- **Redundant Prefixes**: "How to", "Guide to", "Information about"
- **Obvious Statements**: "This is about", "Contains information on"
- **Excessive Adjectives**: "comprehensive", "ultimate", "complete", "full"
- **Time References**: Specific dates unless critical to understanding

### Enhancement Triggers
If the generated content contains any of these patterns, regenerate:
- Generic project names ("Project", "System", "Application")
- Placeholder text ("TODO", "TBD", "Coming soon")
- Duplicate words within title or description
- Technical acronyms without context
- Incomplete sentences or thoughts

## Validation Examples

### ✅ Good Examples

#### Code Example
```
Title: "React Dashboard: Memory Card Drag-and-Drop"
Description: "Interactive memory card component with drag-and-drop reordering. Implements react-beautiful-dnd library for smooth UX."
```

#### Task Example
```
Title: "MCP Server: Ollama Integration Setup"
Description: "Local AI processing integration for memory enhancement. Reduces external API dependency and improves privacy."
```

#### Research Example
```
Title: "Vector Embeddings: Semantic Search Implementation"
Description: "Evaluation of sentence-transformers for memory similarity matching. Performance benchmarks show 40% improvement."
```

### ❌ Bad Examples

#### Too Generic
```
Title: "System Implementation"
Description: "Implementation of various system components for the application."
```

#### Too Verbose
```
Title: "Comprehensive Ultimate Guide to Setting Up Development Environment"
Description: "This comprehensive guide contains detailed information about setting up a complete development environment."
```

#### Redundant
```
Title: "Database Setup"
Description: "Database setup instructions for setting up the database."
```

## Implementation Guidelines

### For AI Models
1. **Read the entire content** before generating title/description
2. **Identify the primary purpose** of the memory
3. **Extract key entities** (technologies, names, specific terms)
4. **Determine the category** to apply appropriate rules
5. **Generate title first**, then description to complement it
6. **Validate against rules** before finalizing

### For Human Review
- Check for rule compliance after AI generation
- Ensure consistency across similar content types
- Verify that titles and descriptions add value
- Confirm that content matches the memory's actual purpose

## Continuous Improvement

### Feedback Loop
- Monitor user interactions with enhanced memories
- Track which titles/descriptions lead to higher engagement
- Identify patterns in successful vs. unsuccessful enhancements
- Update rules based on real-world usage patterns

### Regular Review
- Monthly review of rule effectiveness
- Quarterly updates based on new content patterns
- Annual comprehensive review of all guidelines
- Community feedback integration

## Version History

- **v1.0** (Current): Initial comprehensive ruleset
- **v1.1** (Planned): Category-specific enhancements based on usage data
- **v2.0** (Future): Dynamic rule adaptation based on user preferences

---

*This document is a living guide. Update it as you discover new patterns and requirements for effective memory enhancement.*