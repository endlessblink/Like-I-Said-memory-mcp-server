import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle, 
  PlayCircle,
  BookOpen,
  Zap,
  Target,
  Users,
  Lightbulb
} from 'lucide-react'

interface TutorialStep {
  id: string
  title: string
  content: string
  targetSelector?: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: 'click' | 'input' | 'observe'
  actionText?: string
  highlightColor?: string
  icon?: string
}

interface OnboardingTutorialProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Like I Said! 👋',
    content: 'This interactive tutorial will guide you through the key features of your memory management system. You\'ll learn how to create, organize, and find your memories efficiently.',
    position: 'center',
    icon: '🎯'
  },
  {
    id: 'navigation',
    title: 'Navigation Tabs',
    content: 'Use these tabs to switch between different views: Dashboard for overview, Memories for browsing content, Tasks for project management, and AI Enhancement for content processing.',
    targetSelector: 'nav .hidden.md\\:flex, nav .md\\:flex',
    position: 'bottom',
    action: 'observe',
    icon: '🧭'
  },
  {
    id: 'add-memory',
    title: 'Creating Your First Memory',
    content: 'Click the "Add Memory" button to store information. You can add any text, code snippets, notes, or thoughts. The system will automatically categorize and organize your content.',
    targetSelector: 'button[data-tutorial="add-memory"]',
    position: 'bottom',
    action: 'click',
    actionText: 'Try clicking "Add Memory"',
    highlightColor: 'violet',
    icon: '✏️'
  },
  {
    id: 'categories',
    title: 'Smart Categorization',
    content: 'Your memories are automatically categorized as Personal, Work, Code, Research, Conversations, or Preferences. You can also manually select or override the suggested category.',
    position: 'center',
    icon: '🏷️'
  },
  {
    id: 'search',
    title: 'Advanced Search',
    content: 'Use the search bar to find memories quickly. You can search by content, tags, or use advanced filters. The search supports full-text matching and smart relevance scoring.',
    targetSelector: '[data-tutorial="search"]',
    position: 'bottom',
    action: 'input',
    actionText: 'Try searching for something',
    icon: '🔍'
  },
  {
    id: 'presets',
    title: 'Search Presets',
    content: 'Save your frequently used searches as presets for quick access. The system includes useful defaults like "Recent Code" and "Work Meetings" to get you started.',
    targetSelector: '[data-tutorial="presets"]',
    position: 'bottom',
    action: 'observe',
    icon: '💾'
  },
  {
    id: 'projects',
    title: 'Project Organization',
    content: 'Organize your memories and tasks by projects. This helps you keep related information together and makes it easier to find content within specific contexts.',
    targetSelector: '[data-tutorial="projects"]',
    position: 'top',
    action: 'observe',
    icon: '📁'
  },
  {
    id: 'tasks',
    title: 'Task Management',
    content: 'Switch to the Tasks tab to manage your to-do items. Tasks can be linked to relevant memories automatically, creating a connected knowledge system.',
    targetSelector: '[data-tab="tasks"]',
    position: 'bottom',
    action: 'click',
    actionText: 'Click to view Tasks',
    icon: '✅'
  },
  {
    id: 'memory-linking',
    title: 'Memory-Task Connections',
    content: 'When you create tasks, the system automatically links them to relevant memories based on content similarity. This creates powerful connections between your thoughts and actions.',
    position: 'center',
    icon: '🔗'
  },
  {
    id: 'ai-enhancement',
    title: 'AI-Powered Features',
    content: 'The AI Enhancement tab offers content processing, automatic summarization, and intelligent suggestions to help you work more efficiently with your information.',
    targetSelector: '[data-tab="ai"]',
    position: 'bottom',
    action: 'observe',
    icon: '🤖'
  },
  {
    id: 'templates',
    title: 'Content Templates',
    content: 'Use templates to quickly create structured memories and tasks. Templates help maintain consistency and save time when creating similar types of content.',
    position: 'center',
    icon: '📋'
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    content: 'Master these shortcuts to work efficiently: Ctrl+K (global search), Ctrl+N (new memory), Ctrl+T (new task), Ctrl+E (edit), and Ctrl+/ (show help).',
    position: 'center',
    icon: '⚡'
  },
  {
    id: 'completion',
    title: 'You\'re All Set! 🎉',
    content: 'Congratulations! You\'ve completed the tutorial. Start creating memories, organizing projects, and building your personal knowledge system. The interface will remember your preferences and adapt to your workflow.',
    position: 'center',
    icon: '🏆'
  }
]

export function OnboardingTutorial({ open, onOpenChange, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const step = tutorialSteps[currentStep]

  // Highlight target element
  useEffect(() => {
    if (!open || !step.targetSelector) {
      if (highlightedElement) {
        highlightedElement.style.position = ''
        highlightedElement.style.zIndex = ''
        highlightedElement.style.boxShadow = ''
        setHighlightedElement(null)
      }
      return
    }

    // Try multiple times to find the element (useful for dynamic content)
    const findElement = () => {
      return document.querySelector(step.targetSelector) as HTMLElement
    }

    let element = findElement()
    
    // If element not found, try again after a short delay
    if (!element) {
      setTimeout(() => {
        element = findElement()
        if (element) {
          element.style.position = 'relative'
          element.style.zIndex = '50'
          element.style.boxShadow = `0 0 0 4px ${step.highlightColor === 'violet' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(59, 130, 246, 0.5)'}, 0 0 20px rgba(59, 130, 246, 0.3)`
          setHighlightedElement(element)
        } else {
          console.warn(`Tutorial: Element not found after retry for selector: ${step.targetSelector}`)
        }
      }, 100)
    } else {
      element.style.position = 'relative'
      element.style.zIndex = '50'
      element.style.boxShadow = `0 0 0 4px ${step.highlightColor === 'violet' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(59, 130, 246, 0.5)'}, 0 0 20px rgba(59, 130, 246, 0.3)`
      setHighlightedElement(element)
    }

    return () => {
      if (element) {
        element.style.position = ''
        element.style.zIndex = ''
        element.style.boxShadow = ''
      }
    }
  }, [currentStep, open, step.targetSelector, step.highlightColor])

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const skipTutorial = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setIsCompleted(true)
    localStorage.setItem('onboarding-completed', 'true')
    onComplete()
    onOpenChange(false)
  }

  // Reset tutorial state when opening
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setIsCompleted(false)
    }
  }, [open])

  const getTooltipPosition = (): React.CSSProperties => {
    if (!step.targetSelector || step.position === 'center') {
      // For center position, ensure tooltip doesn't overlap with nav bar
      // Nav bar is approximately 80px tall (from minHeight in App.tsx)
      const navBarHeight = 80;
      const viewportHeight = window.innerHeight;
      const tooltipHeight = 400; // Approximate height of tooltip with all content
      const availableHeight = viewportHeight - navBarHeight;
      
      // Position tooltip in the center of available space below nav
      const centerY = navBarHeight + (availableHeight / 2);
      
      return {
        position: 'fixed',
        top: `${centerY}px`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
        maxHeight: `${availableHeight - 40}px`, // Leave some margin
        overflowY: 'auto'
      }
    }

    const element = document.querySelector(step.targetSelector) as HTMLElement
    if (!element) {
      // Fallback to adjusted center position
      const navBarHeight = 80;
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - navBarHeight;
      const centerY = navBarHeight + (availableHeight / 2);
      
      return {
        position: 'fixed',
        top: `${centerY}px`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
        maxHeight: `${availableHeight - 40}px`,
        overflowY: 'auto'
      }
    }

    const rect = element.getBoundingClientRect()
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 60
    }

    switch (step.position) {
      case 'top':
        const tooltipWidthTop = Math.min(320, window.innerWidth - 40) // w-80 capped by viewport
        const marginTop = 20 // Safety margin from viewport edges
        
        let topY = rect.top - 10 // Position above element with margin
        let topX = rect.left + rect.width / 2
        
        // Keep horizontally within viewport bounds
        if (topX - tooltipWidthTop/2 < marginTop) {
          topX = marginTop + tooltipWidthTop/2
        } else if (topX + tooltipWidthTop/2 > window.innerWidth - marginTop) {
          topX = window.innerWidth - marginTop - tooltipWidthTop/2
        }
        
        style.bottom = `${window.innerHeight - topY}px`
        style.left = `${topX}px`
        style.transform = 'translateX(-50%)'
        break
      case 'bottom':
        const tooltipWidth = Math.min(320, window.innerWidth - 40) // w-80 capped by viewport
        const margin = 20 // Safety margin from viewport edges
        
        let bottomY = rect.bottom + 10
        let bottomX = rect.left + rect.width / 2
        
        // Keep horizontally within viewport bounds
        if (bottomX - tooltipWidth/2 < margin) {
          bottomX = margin + tooltipWidth/2
        } else if (bottomX + tooltipWidth/2 > window.innerWidth - margin) {
          bottomX = window.innerWidth - margin - tooltipWidth/2
        }
        
        style.top = `${bottomY}px`
        style.left = `${bottomX}px`
        style.transform = 'translateX(-50%)'
        break
      case 'left':
        style.right = `${window.innerWidth - rect.left + 10}px`
        style.top = `${rect.top + rect.height / 2}px`
        style.transform = 'translateY(-50%)'
        break
      case 'right':
        const tooltipWidthRight = Math.min(320, window.innerWidth - 40) // w-80 capped by viewport
        const marginRight = 20 // Safety margin from viewport edges
        const navBarHeight = 80
        
        let rightX = rect.right + 10
        let rightY = rect.top + rect.height / 2
        
        // Keep within viewport bounds horizontally 
        if (rightX + tooltipWidthRight > window.innerWidth - marginRight) {
          // Switch to left side if no room on right
          rightX = rect.left - tooltipWidthRight - 10
          if (rightX < marginRight) {
            rightX = marginRight
          }
        }
        
        // Keep within viewport bounds vertically
        const tooltipHeight = 400
        if (rightY - tooltipHeight/2 < navBarHeight + marginRight) {
          rightY = navBarHeight + marginRight + tooltipHeight/2
        } else if (rightY + tooltipHeight/2 > window.innerHeight - marginRight) {
          rightY = window.innerHeight - marginRight - tooltipHeight/2
        }
        
        style.left = `${rightX}px`
        style.top = `${rightY}px`
        style.transform = 'translateY(-50%)'
        break
      default:
        style.top = '50%'
        style.left = '50%'
        style.transform = 'translate(-50%, -50%)'
    }

    return style
  }

  if (!open) return null

  return (
    <>
      {/* Dark overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-30"
        style={{ zIndex: 40 }}
        onClick={() => onOpenChange(false)}
      />

      {/* Tutorial tooltip */}
      <Card
        className="w-80 max-w-[calc(100vw-40px)] bg-gray-800 border-gray-600 text-white shadow-xl"
        style={getTooltipPosition()}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {step.icon && <span className="text-xl">{step.icon}</span>}
              <h3 className="font-semibold text-lg">{step.title}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTutorial}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div
                className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>
            <Badge variant="outline" className="text-xs text-violet-400 border-violet-500/30">
              {currentStep + 1} of {tutorialSteps.length}
            </Badge>
          </div>

          {/* Content */}
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {step.content}
          </p>

          {/* Action hint */}
          {step.action && step.actionText && (
            <div className="mb-4 p-3 bg-violet-500/20 border border-violet-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-violet-300 text-sm">
                {step.action === 'click' && <Target className="w-4 h-4" />}
                {step.action === 'input' && <Lightbulb className="w-4 h-4" />}
                {step.action === 'observe' && <BookOpen className="w-4 h-4" />}
                <span>{step.actionText}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="border-gray-600 text-gray-300 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStep < tutorialSteps.length - 1 ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipTutorial}
                    className="border-gray-600 text-gray-400 hover:text-white"
                  >
                    Skip Tutorial
                  </Button>
                  <Button
                    size="sm"
                    onClick={nextStep}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleComplete}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete Tutorial
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Tutorial launcher component
interface TutorialLauncherProps {
  className?: string
}

export function TutorialLauncher({ className = '', ...props }: TutorialLauncherProps & React.HTMLAttributes<HTMLDivElement>) {
  const [showTutorial, setShowTutorial] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('onboarding-completed')
    setHasCompletedOnboarding(completed === 'true')

    // Auto-show tutorial for new users after a short delay (disabled for better UX)
    // if (!completed) {
    //   const timer = setTimeout(() => {
    //     setShowTutorial(true)
    //   }, 1000)
    //   return () => clearTimeout(timer)
    // }
  }, [])

  const startTutorial = () => {
    setShowTutorial(true)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding-completed')
    setHasCompletedOnboarding(false)
    setShowTutorial(true)
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`} {...props}>
        <Button
          variant="outline"
          size="sm"
          onClick={startTutorial}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {hasCompletedOnboarding ? 'Replay Tutorial' : 'Start Tutorial'}
        </Button>
        
        {hasCompletedOnboarding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetOnboarding}
            className="text-gray-500 hover:text-gray-300 text-xs"
            title="Reset tutorial and show for new users"
          >
            Reset
          </Button>
        )}
      </div>

      <OnboardingTutorial
        open={showTutorial}
        onOpenChange={setShowTutorial}
        onComplete={() => {
          setHasCompletedOnboarding(true)
          setShowTutorial(false)
        }}
      />
    </>
  )
}