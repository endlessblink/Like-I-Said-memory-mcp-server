import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Wand2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Brain, 
  Tags, 
  FolderTree, 
  Sparkles,
  FileText,
  Code,
  Database,
  Star,
  Lightbulb,
  Target,
  Clock,
  X
} from 'lucide-react'

interface MemoryCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateMemory: (content: string, metadata: MemoryMetadata) => Promise<void>
  availableProjects: string[]
  availableTags: string[]
  recentCategories?: string[]
}

interface MemoryMetadata {
  category?: string
  project?: string
  tags: string[]
  priority?: 'low' | 'medium' | 'high'
  contentType?: 'text' | 'code' | 'structured'
  title?: string
  summary?: string
}

interface MemoryTemplate {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  contentTemplate: string
  suggestedTags: string[]
  category: string
  contentType: 'text' | 'code' | 'structured'
}

const memoryTemplates: MemoryTemplate[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    icon: <Clock className="h-4 w-4" />,
    description: 'Capture important points from meetings',
    contentTemplate: `# Meeting Notes - {{date}}

## Attendees
- 

## Key Points
- 

## Action Items
- [ ] 

## Next Steps
- `,
    suggestedTags: ['meeting', 'notes'],
    category: 'work',
    contentType: 'structured'
  },
  {
    id: 'code-snippet',
    name: 'Code Snippet',
    icon: <Code className="h-4 w-4" />,
    description: 'Save useful code snippets',
    contentTemplate: `# {{title}}

## Description
Brief description of what this code does

## Code
\`\`\`{{language}}
// Your code here
\`\`\`

## Usage
How to use this code snippet

## Notes
- Any important notes or considerations`,
    suggestedTags: ['code', 'snippet'],
    category: 'code',
    contentType: 'code'
  },
  {
    id: 'idea',
    name: 'Idea / Insight',
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Capture creative ideas and insights',
    contentTemplate: `# {{title}}

## The Idea
Describe your idea or insight here

## Context
What led to this idea?

## Potential Applications
- How could this be used?
- What problems might it solve?

## Next Steps
- [ ] Research further
- [ ] Discuss with team
- [ ] Create prototype`,
    suggestedTags: ['idea', 'insight'],
    category: 'research',
    contentType: 'structured'
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
    icon: <Database className="h-4 w-4" />,
    description: 'Document research findings',
    contentTemplate: `# Research: {{topic}}

## Objective
What are you trying to learn or understand?

## Key Findings
- 

## Sources
- 

## Conclusions
What did you learn? How will you apply this?

## Follow-up Questions
- `,
    suggestedTags: ['research', 'notes'],
    category: 'research',
    contentType: 'structured'
  },
  {
    id: 'quick-note',
    name: 'Quick Note',
    icon: <FileText className="h-4 w-4" />,
    description: 'Simple text note',
    contentTemplate: '',
    suggestedTags: ['note'],
    category: 'personal',
    contentType: 'text'
  },
  {
    id: 'decision-log',
    name: 'Decision Log',
    icon: <Target className="h-4 w-4" />,
    description: 'Document important decisions',
    contentTemplate: `# Decision: {{title}}

## Context
What situation led to this decision?

## Options Considered
1. Option A - pros/cons
2. Option B - pros/cons
3. Option C - pros/cons

## Decision
What was decided and why?

## Impact
Expected outcomes and next steps

## Review Date
When should this decision be reviewed?`,
    suggestedTags: ['decision', 'log'],
    category: 'work',
    contentType: 'structured'
  }
]

const STEPS = [
  { id: 'template', title: 'Choose Template', icon: <Wand2 className="h-4 w-4" /> },
  { id: 'content', title: 'Add Content', icon: <FileText className="h-4 w-4" /> },
  { id: 'metadata', title: 'Organize', icon: <Tags className="h-4 w-4" /> },
  { id: 'review', title: 'Review', icon: <CheckCircle className="h-4 w-4" /> }
]

export function MemoryCreationWizard({
  open,
  onOpenChange,
  onCreateMemory,
  availableProjects,
  availableTags,
  recentCategories = []
}: MemoryCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<MemoryTemplate | null>(null)
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState<MemoryMetadata>({
    tags: [],
    priority: 'medium',
    contentType: 'text'
  })
  const [tagInput, setTagInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [suggestions, setSuggestions] = useState<{
    category?: string
    tags: string[]
    contentType?: 'text' | 'code' | 'structured'
  }>({ tags: [] })

  // Reset wizard when closed
  useEffect(() => {
    if (!open) {
      setCurrentStep(0)
      setSelectedTemplate(null)
      setContent('')
      setMetadata({
        tags: [],
        priority: 'medium',
        contentType: 'text'
      })
      setTagInput('')
      setSuggestions({ tags: [] })
    }
  }, [open])

  // Auto-detect content type and suggest categories
  useEffect(() => {
    if (content.trim()) {
      const newSuggestions = analyzeContent(content)
      setSuggestions(newSuggestions)
      
      // Auto-apply suggestions if not already set
      if (!metadata.category && newSuggestions.category) {
        setMetadata(prev => ({ ...prev, category: newSuggestions.category }))
      }
      if (!metadata.contentType && newSuggestions.contentType) {
        setMetadata(prev => ({ ...prev, contentType: newSuggestions.contentType }))
      }
    }
  }, [content, metadata.category, metadata.contentType])

  const analyzeContent = (text: string) => {
    const lowerText = text.toLowerCase()
    const suggestions: any = { tags: [] }

    // Detect content type
    if (text.includes('```') || text.includes('function') || text.includes('const ') || text.includes('import ')) {
      suggestions.contentType = 'code'
      suggestions.tags.push('code')
    } else if (text.includes('##') || text.includes('- [ ]') || text.includes('###')) {
      suggestions.contentType = 'structured'
    } else {
      suggestions.contentType = 'text'
    }

    // Suggest category based on content
    if (lowerText.includes('meeting') || lowerText.includes('attendees') || lowerText.includes('action item')) {
      suggestions.category = 'work'
      suggestions.tags.push('meeting')
    } else if (lowerText.includes('bug') || lowerText.includes('error') || lowerText.includes('fix')) {
      suggestions.category = 'code'
      suggestions.tags.push('debugging')
    } else if (lowerText.includes('research') || lowerText.includes('study') || lowerText.includes('findings')) {
      suggestions.category = 'research'
      suggestions.tags.push('research')
    } else if (lowerText.includes('idea') || lowerText.includes('concept') || lowerText.includes('brainstorm')) {
      suggestions.category = 'research'
      suggestions.tags.push('idea')
    }

    // Extract hashtags
    const hashtagMatches = text.match(/#(\w+)/g)
    if (hashtagMatches) {
      suggestions.tags.push(...hashtagMatches.map(tag => tag.substring(1)))
    }

    return suggestions
  }

  const applyTemplate = (template: MemoryTemplate) => {
    setSelectedTemplate(template)
    const now = new Date()
    const templatedContent = template.contentTemplate
      .replace(/{{date}}/g, now.toLocaleDateString())
      .replace(/{{title}}/g, metadata.title || 'Title')
      .replace(/{{topic}}/g, 'Topic')
      .replace(/{{language}}/g, 'javascript')

    setContent(templatedContent)
    setMetadata(prev => ({
      ...prev,
      category: template.category,
      contentType: template.contentType,
      tags: [...new Set([...prev.tags, ...template.suggestedTags])]
    }))
    setCurrentStep(1)
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !metadata.tags.includes(tag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    if (!content.trim()) return

    setIsCreating(true)
    try {
      await onCreateMemory(content, {
        ...metadata,
        title: extractTitle(content),
        summary: extractSummary(content)
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create memory:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const extractTitle = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim())
    const firstLine = lines[0]?.trim()
    
    if (firstLine?.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '').trim()
    }
    
    return firstLine?.substring(0, 60) + (firstLine?.length > 60 ? '...' : '') || 'Untitled Memory'
  }

  const extractSummary = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    const firstParagraph = lines.slice(0, 3).join(' ').trim()
    return firstParagraph.substring(0, 150) + (firstParagraph.length > 150 ? '...' : '')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true // Template selection is optional
      case 1: return content.trim().length > 0
      case 2: return true // Metadata is optional
      case 3: return content.trim().length > 0
      default: return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Template Selection
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Choose a Template</h3>
              <p className="text-gray-400 text-sm">
                Select a template to get started quickly, or skip to create from scratch
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memoryTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer border-gray-600 hover:border-violet-500 transition-colors ${
                    selectedTemplate?.id === template.id ? 'border-violet-500 bg-violet-950/20' : 'bg-gray-800'
                  }`}
                  onClick={() => applyTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-violet-600/20 rounded-lg text-violet-400">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{template.name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.suggestedTags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
                className="border-gray-600 text-gray-300"
              >
                Skip - Create from scratch
              </Button>
            </div>
          </div>
        )

      case 1: // Content Creation
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Your Content</h3>
                <p className="text-gray-400 text-sm">
                  {selectedTemplate ? `Using ${selectedTemplate.name} template` : 'Write your memory content'}
                </p>
              </div>
              {selectedTemplate && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {selectedTemplate.icon}
                  {selectedTemplate.name}
                </Badge>
              )}
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your memory content..."
              className="bg-gray-700 border-gray-600 text-white min-h-[300px] font-mono text-sm"
              autoFocus
            />

            {suggestions.tags.length > 0 && (
              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">Smart Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.tags.map(tag => (
                    <Badge 
                      key={tag}
                      variant="outline"
                      className="cursor-pointer text-blue-300 border-blue-400 hover:bg-blue-400 hover:text-black"
                      onClick={() => addTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              {content.length} characters • Use #hashtags for auto-tagging
            </div>
          </div>
        )

      case 2: // Metadata
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Organize Your Memory</h3>
              <p className="text-gray-400 text-sm">Add tags, category, and project to help organize this memory</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Category</label>
                <Select value={metadata.category || ''} onValueChange={(value) => setMetadata(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="conversations">Conversations</SelectItem>
                    <SelectItem value="preferences">Preferences</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Priority</label>
                <Select value={metadata.priority} onValueChange={(value: any) => setMetadata(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Project</label>
              <Select value={metadata.project || ''} onValueChange={(value) => setMetadata(prev => ({ ...prev, project: value === 'none' ? undefined : value }))}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Tags</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(tagInput)
                      }
                    }}
                    placeholder="Add a tag..."
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                  />
                  <Button 
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>

                {metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {metadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        #{tag}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {availableTags.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500">Popular tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.slice(0, 8).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer text-gray-400 hover:text-white hover:border-gray-400"
                          onClick={() => addTag(tag)}
                        >
                          + {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 3: // Review
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Review Your Memory</h3>
              <p className="text-gray-400 text-sm">Check everything looks good before creating</p>
            </div>

            <div className="space-y-4">
              {/* Metadata Summary */}
              <Card className="bg-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <span className="ml-2 text-white">{metadata.category || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Priority:</span>
                      <span className="ml-2 text-white capitalize">{metadata.priority}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Project:</span>
                      <span className="ml-2 text-white">{metadata.project || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Content Type:</span>
                      <span className="ml-2 text-white capitalize">{metadata.contentType}</span>
                    </div>
                  </div>
                  
                  {metadata.tags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {metadata.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">#{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content Preview */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Content Preview</label>
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {content.substring(0, 500)}
                    {content.length > 500 && (
                      <span className="text-gray-500">... ({content.length - 500} more characters)</span>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            Create Memory
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-gray-400">{Math.round(((currentStep + 1) / STEPS.length) * 100)}% Complete</span>
          </div>
          <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-center gap-2 ${index <= currentStep ? 'text-violet-400' : 'text-gray-500'}`}
            >
              <div className={`p-2 rounded-lg ${index <= currentStep ? 'bg-violet-600/20' : 'bg-gray-700'}`}>
                {step.icon}
              </div>
              <span className="text-sm font-medium hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <Button 
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="border-gray-600 text-gray-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={!canProceed() || isCreating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Memory
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}