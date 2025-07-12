import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Template {
  id: string
  name: string
  description: string
  type: 'memory' | 'task'
  category: string
  content: string
  tags: string[]
  icon: string
  variables?: {
    name: string
    placeholder: string
    required: boolean
  }[]
}

interface TemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'memory' | 'task'
  onSelectTemplate: (template: Template, variables: Record<string, string>) => void
}

const MEMORY_TEMPLATES: Template[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structure for recording meeting discussions and action items',
    type: 'memory',
    category: 'work',
    icon: '🤝',
    tags: ['meeting', 'notes', 'work'],
    content: `# Meeting Notes - {{meeting_title}}

**Date:** {{date}}
**Attendees:** {{attendees}}
**Duration:** {{duration}}

## Agenda
{{agenda}}

## Key Discussions
{{discussions}}

## Decisions Made
{{decisions}}

## Action Items
{{action_items}}

## Follow-up
{{follow_up}}`,
    variables: [
      { name: 'meeting_title', placeholder: 'Weekly Team Sync', required: true },
      { name: 'date', placeholder: 'January 15, 2025', required: true },
      { name: 'attendees', placeholder: 'John, Sarah, Mike', required: true },
      { name: 'duration', placeholder: '1 hour', required: false },
      { name: 'agenda', placeholder: 'Project updates, blockers, next steps', required: false },
      { name: 'discussions', placeholder: 'Key points discussed', required: false },
      { name: 'decisions', placeholder: 'Important decisions made', required: false },
      { name: 'action_items', placeholder: 'Tasks assigned and deadlines', required: false },
      { name: 'follow_up', placeholder: 'Next meeting date and agenda', required: false }
    ]
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Template for documenting software bugs and issues',
    type: 'memory',
    category: 'code',
    icon: '🐛',
    tags: ['bug', 'issue', 'development'],
    content: `# Bug Report - {{title}}

**Priority:** {{priority}}
**Component:** {{component}}
**Environment:** {{environment}}

## Description
{{description}}

## Steps to Reproduce
{{steps}}

## Expected Behavior
{{expected}}

## Actual Behavior
{{actual}}

## Screenshots/Logs
{{evidence}}

## Potential Fix
{{fix_notes}}`,
    variables: [
      { name: 'title', placeholder: 'Login button not responding', required: true },
      { name: 'priority', placeholder: 'High', required: true },
      { name: 'component', placeholder: 'Authentication Module', required: true },
      { name: 'environment', placeholder: 'Production/Staging/Local', required: true },
      { name: 'description', placeholder: 'Brief description of the issue', required: true },
      { name: 'steps', placeholder: '1. Go to login page 2. Enter credentials 3. Click login', required: true },
      { name: 'expected', placeholder: 'User should be logged in', required: true },
      { name: 'actual', placeholder: 'Nothing happens when clicking login', required: true },
      { name: 'evidence', placeholder: 'Console errors, screenshots, etc.', required: false },
      { name: 'fix_notes', placeholder: 'Ideas for potential solutions', required: false }
    ]
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
    description: 'Template for organizing research findings and sources',
    type: 'memory',
    category: 'research',
    icon: '📚',
    tags: ['research', 'study', 'knowledge'],
    content: `# Research Notes - {{topic}}

**Date:** {{date}}
**Research Question:** {{question}}
**Sources:** {{sources}}

## Key Findings
{{findings}}

## Important Quotes
{{quotes}}

## Data/Statistics
{{data}}

## Conclusions
{{conclusions}}

## Further Research Needed
{{further_research}}

## References
{{references}}`,
    variables: [
      { name: 'topic', placeholder: 'AI Ethics in Healthcare', required: true },
      { name: 'date', placeholder: 'January 15, 2025', required: true },
      { name: 'question', placeholder: 'What are the ethical implications of AI in medical diagnosis?', required: true },
      { name: 'sources', placeholder: 'Academic papers, reports, articles', required: true },
      { name: 'findings', placeholder: 'Main discoveries and insights', required: true },
      { name: 'quotes', placeholder: 'Important quotes with attribution', required: false },
      { name: 'data', placeholder: 'Relevant statistics and data points', required: false },
      { name: 'conclusions', placeholder: 'What can be concluded from this research', required: false },
      { name: 'further_research', placeholder: 'Areas that need more investigation', required: false },
      { name: 'references', placeholder: 'Full citations and links', required: false }
    ]
  },
  {
    id: 'learning-notes',
    name: 'Learning Notes',
    description: 'Template for capturing learning from courses, tutorials, or books',
    type: 'memory',
    category: 'personal',
    icon: '🎓',
    tags: ['learning', 'education', 'knowledge'],
    content: `# Learning Notes - {{subject}}

**Source:** {{source}}
**Date:** {{date}}
**Progress:** {{progress}}

## Key Concepts
{{concepts}}

## Examples
{{examples}}

## Personal Insights
{{insights}}

## Questions to Explore
{{questions}}

## Practical Applications
{{applications}}

## Next Steps
{{next_steps}}`,
    variables: [
      { name: 'subject', placeholder: 'React Hooks', required: true },
      { name: 'source', placeholder: 'Official React Documentation', required: true },
      { name: 'date', placeholder: 'January 15, 2025', required: true },
      { name: 'progress', placeholder: '50% complete', required: false },
      { name: 'concepts', placeholder: 'useState, useEffect, custom hooks', required: true },
      { name: 'examples', placeholder: 'Code examples and use cases', required: false },
      { name: 'insights', placeholder: 'Personal understanding and connections', required: false },
      { name: 'questions', placeholder: 'Things to research further', required: false },
      { name: 'applications', placeholder: 'How to apply this knowledge', required: false },
      { name: 'next_steps', placeholder: 'What to learn next', required: false }
    ]
  }
]

const TASK_TEMPLATES: Template[] = [
  {
    id: 'feature-development',
    name: 'Feature Development',
    description: 'Complete workflow for developing a new feature',
    type: 'task',
    category: 'code',
    icon: '⚡',
    tags: ['development', 'feature', 'coding'],
    content: `Develop {{feature_name}} feature

## Requirements
{{requirements}}

## Implementation Plan
1. Design and planning
2. Backend implementation
3. Frontend development
4. Testing
5. Documentation
6. Code review
7. Deployment

## Acceptance Criteria
{{acceptance_criteria}}

## Estimated Effort: {{effort}}
## Deadline: {{deadline}}`,
    variables: [
      { name: 'feature_name', placeholder: 'User Authentication', required: true },
      { name: 'requirements', placeholder: 'Users should be able to login/logout/register', required: true },
      { name: 'acceptance_criteria', placeholder: 'Clear success criteria', required: true },
      { name: 'effort', placeholder: '2 weeks', required: false },
      { name: 'deadline', placeholder: 'End of month', required: false }
    ]
  },
  {
    id: 'bug-fix',
    name: 'Bug Fix Task',
    description: 'Structured approach to fixing bugs',
    type: 'task',
    category: 'code',
    icon: '🔧',
    tags: ['bugfix', 'maintenance', 'coding'],
    content: `Fix: {{bug_title}}

## Problem Description
{{problem}}

## Root Cause
{{root_cause}}

## Proposed Solution
{{solution}}

## Testing Plan
{{testing}}

## Priority: {{priority}}
## Affected Users: {{impact}}`,
    variables: [
      { name: 'bug_title', placeholder: 'Login form validation error', required: true },
      { name: 'problem', placeholder: 'Describe the bug', required: true },
      { name: 'root_cause', placeholder: 'Why is this happening?', required: false },
      { name: 'solution', placeholder: 'How to fix it', required: true },
      { name: 'testing', placeholder: 'How to verify the fix', required: true },
      { name: 'priority', placeholder: 'High/Medium/Low', required: true },
      { name: 'impact', placeholder: 'Who is affected', required: false }
    ]
  },
  {
    id: 'research-task',
    name: 'Research Task',
    description: 'Systematic approach to research and investigation',
    type: 'task',
    category: 'research',
    icon: '🔍',
    tags: ['research', 'investigation', 'analysis'],
    content: `Research: {{research_topic}}

## Objective
{{objective}}

## Key Questions
{{questions}}

## Research Methods
{{methods}}

## Expected Deliverables
{{deliverables}}

## Timeline: {{timeline}}
## Success Criteria: {{success_criteria}}`,
    variables: [
      { name: 'research_topic', placeholder: 'Best practices for API design', required: true },
      { name: 'objective', placeholder: 'What are we trying to learn?', required: true },
      { name: 'questions', placeholder: 'Specific questions to answer', required: true },
      { name: 'methods', placeholder: 'How will you research this?', required: true },
      { name: 'deliverables', placeholder: 'What will you produce?', required: true },
      { name: 'timeline', placeholder: '1 week', required: false },
      { name: 'success_criteria', placeholder: 'How to know when done', required: false }
    ]
  },
  {
    id: 'project-planning',
    name: 'Project Planning',
    description: 'Template for planning and organizing projects',
    type: 'task',
    category: 'work',
    icon: '📋',
    tags: ['planning', 'project', 'management'],
    content: `Plan: {{project_name}}

## Project Overview
{{overview}}

## Goals and Objectives
{{goals}}

## Key Milestones
{{milestones}}

## Resource Requirements
{{resources}}

## Timeline
{{timeline}}

## Risk Assessment
{{risks}}

## Success Metrics
{{metrics}}`,
    variables: [
      { name: 'project_name', placeholder: 'Q1 Product Launch', required: true },
      { name: 'overview', placeholder: 'Brief project description', required: true },
      { name: 'goals', placeholder: 'What do we want to achieve?', required: true },
      { name: 'milestones', placeholder: 'Key dates and deliverables', required: true },
      { name: 'resources', placeholder: 'People, budget, tools needed', required: false },
      { name: 'timeline', placeholder: 'Start and end dates', required: true },
      { name: 'risks', placeholder: 'Potential challenges', required: false },
      { name: 'metrics', placeholder: 'How to measure success', required: false }
    ]
  }
]

export function TemplateSelector({ open, onOpenChange, type, onSelectTemplate }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [showVariables, setShowVariables] = useState(false)

  const templates = type === 'memory' ? MEMORY_TEMPLATES : TASK_TEMPLATES

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    if (template.variables && template.variables.length > 0) {
      setShowVariables(true)
      // Initialize variables with empty values
      const initialVars: Record<string, string> = {}
      template.variables.forEach(variable => {
        initialVars[variable.name] = ''
      })
      setVariables(initialVars)
    } else {
      // No variables, use template directly
      onSelectTemplate(template, {})
      handleClose()
    }
  }

  const handleVariableChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }))
  }

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate, variables)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setVariables({})
    setShowVariables(false)
    onOpenChange(false)
  }

  const canUseTemplate = selectedTemplate && (!selectedTemplate.variables || 
    selectedTemplate.variables.filter(v => v.required).every(v => variables[v.name]?.trim()))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{type === 'memory' ? '🧠' : '📋'}</span>
            {type === 'memory' ? 'Memory' : 'Task'} Templates
          </DialogTitle>
        </DialogHeader>

        {!showVariables ? (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Choose a template to get started quickly with common {type} formats.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-900/70"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs text-gray-500">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : selectedTemplate && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
              <span className="text-2xl">{selectedTemplate.icon}</span>
              <div>
                <h3 className="font-semibold text-white">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-400">{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Fill in the template variables:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.variables?.map((variable) => (
                  <div key={variable.name}>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      {variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {variable.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <Input
                      value={variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={variable.placeholder}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowVariables(false)}>
                Back
              </Button>
              <Button 
                onClick={handleUseTemplate}
                disabled={!canUseTemplate}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Use Template
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}