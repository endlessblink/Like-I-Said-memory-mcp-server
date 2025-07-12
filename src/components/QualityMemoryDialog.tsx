import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { QualityBadge } from "./QualityBadge"
import { useQualityStandards } from "@/hooks/useQualityStandards"
import { Memory } from '@/types'

interface QualityMemoryDialogProps {
  onAdd: (content: string) => Promise<void>
  children: React.ReactNode
}

export function QualityMemoryDialog({ onAdd, children }: QualityMemoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { validateMemory, suggestImprovedTitle, standards } = useQualityStandards()
  const [validation, setValidation] = useState<{
    score: number
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
    issues: string[]
    suggestions: string[]
    meetsStandards: boolean
  } | null>(null)

  // Validate content on change
  useEffect(() => {
    if (!content.trim() || !standards) {
      setValidation(null)
      return
    }

    // Create a temporary memory for validation
    const tempMemory: Memory = {
      id: 'temp',
      timestamp: new Date().toISOString(),
      content,
      tags: [],
      category: 'personal',
      complexity: 1,
      project: 'default',
      priority: 'medium',
      status: 'active',
      metadata: {}
    }

    const result = validateMemory(tempMemory)
    setValidation(result)
  }, [content, validateMemory, standards])

  const handleSubmit = async () => {
    if (!content.trim() || !validation) return

    // Warn if quality is poor
    if (!validation.meetsStandards) {
      const confirm = window.confirm(
        `This memory has quality issues:\n${validation.issues.join('\n')}\n\nDo you want to save it anyway?`
      )
      if (!confirm) return
    }

    setIsSubmitting(true)
    try {
      await onAdd(content)
      setContent("")
      setValidation(null)
      setOpen(false)
    } catch (error) {
      console.error('Failed to add memory:', error)
      alert('Failed to add memory')
    } finally {
      setIsSubmitting(false)
    }
  }

  const applyImprovement = () => {
    if (!validation || !content) return
    
    // Extract title from content
    const titleMatch = content.match(/^#+\s+(.+)$/m)
    if (titleMatch) {
      const currentTitle = titleMatch[1]
      const improvedTitle = suggestImprovedTitle(currentTitle)
      const newContent = content.replace(titleMatch[0], `# ${improvedTitle}`)
      setContent(newContent)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-[#232329] border-[#35353b] text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Quality Memory</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a memory that meets quality standards
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Memory Content</Label>
              {validation && (
                <QualityBadge 
                  score={validation.score} 
                  size="md" 
                  showScore={true}
                  showLabel={true}
                />
              )}
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Implement WebSocket Real-time Synchronization\n\nImplemented WebSocket connection in dashboard-server-bridge.js to enable real-time memory updates..."
              className="bg-[#2a2a30] border-[#35353b] text-white min-h-[200px] font-mono"
            />
            <div className="text-xs text-gray-500">
              Use markdown format. Start with # for title. Min {standards?.titleMinLength || 15} chars for title, 
              {standards?.descriptionMinLength || 50} chars for description.
            </div>
          </div>

          {/* Quality Feedback */}
          {validation && (
            <div className="space-y-2">
              {validation.issues.length > 0 && (
                <Alert className="bg-red-900/20 border-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Quality Issues:</div>
                    <ul className="list-disc list-inside text-sm">
                      {validation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.suggestions.length > 0 && (
                <Alert className="bg-yellow-900/20 border-yellow-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Suggestions:</div>
                    <ul className="list-disc list-inside text-sm">
                      {validation.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                    {validation.issues.some(i => i.includes('title')) && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2"
                        onClick={applyImprovement}
                      >
                        Apply Title Improvement
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {validation.meetsStandards && (
                <Alert className="bg-green-900/20 border-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Memory meets quality standards!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {validation && !validation.meetsStandards && (
              <span className="text-yellow-500">
                ⚠️ Quality score below {standards?.qualityThresholds.passing || 70}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!content.trim() || isSubmitting}
              className={
                validation?.meetsStandards 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-violet-600 hover:bg-violet-700"
              }
            >
              {isSubmitting ? 'Creating...' : 'Create Memory'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}