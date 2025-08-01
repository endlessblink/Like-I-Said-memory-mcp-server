# Memory Quality Standards Configuration

This file defines quality standards for memory validation and enhancement in the Like-I-Said MCP Server.

## Quality Levels

```yaml
quality_levels:
  excellent:
    score_range: [90, 100]
    description: "Exceptional quality, well-structured, highly valuable"
    requirements:
      - Clear, descriptive title
      - Comprehensive content
      - Proper categorization
      - Relevant tags
      - Strong connections to other memories

  good:
    score_range: [70, 89]
    description: "Good quality, useful content"
    requirements:
      - Adequate title
      - Sufficient content
      - Basic categorization
      - Some tags

  needs_improvement:
    score_range: [50, 69]
    description: "Below standard, requires enhancement"
    issues:
      - Vague title
      - Minimal content
      - Poor categorization
      - Missing tags

  poor:
    score_range: [0, 49]
    description: "Very low quality, consider deletion or major revision"
    issues:
      - No clear title
      - Insufficient content
      - No categorization
      - No tags
```

## Validation Rules

```yaml
validation_rules:
  title:
    min_length: 10
    max_length: 100
    required: true
    weight: 0.3

  content:
    min_length: 50
    max_length: 10000
    required: true
    weight: 0.4

  tags:
    min_count: 1
    max_count: 10
    weight: 0.15

  category:
    required: true
    weight: 0.15
    valid_values:
      - personal
      - work
      - code
      - research
      - conversations
      - preferences
```

## Enhancement Priorities

```yaml
enhancement_priorities:
  - missing_title
  - missing_summary
  - short_content
  - no_tags
  - no_category
  - no_connections
```

## Auto-Enhancement Settings

```yaml
auto_enhancement:
  enabled: true
  batch_size: 10
  model: "gpt-3.5-turbo"
  ollama_fallback: "llama3.1:8b"
  max_retries: 3
```