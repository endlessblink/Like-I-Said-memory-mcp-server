import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react'

interface TaskStatusButtonProps {
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  currentStatus: 'todo' | 'in_progress' | 'done' | 'blocked'
  onClick: () => void
  compact?: boolean
  showAnimation?: boolean
}

const statusConfig = {
  todo: {
    icon: Circle,
    emoji: '📋',
    label: 'To Do',
    actionLabel: 'Move to To Do',
    tooltip: 'Click to mark this task as "To Do" - ready to be started',
    description: 'Task is waiting to be started',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    hoverBg: 'hover:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-500/50',
    activeBg: 'bg-blue-500/20',
    activeBorder: 'border-blue-500/60',
    ring: 'ring-blue-500/40',
    shadow: 'shadow-blue-500/20',
    gradient: 'from-blue-500/20 to-blue-600/20',
    pulseColor: 'animate-pulse-blue'
  },
  in_progress: {
    icon: PlayCircle,
    emoji: '⚡',
    label: 'In Progress',
    actionLabel: 'Start Working',
    tooltip: 'Click to mark this task as "In Progress" - currently being worked on',
    description: 'Task is currently being worked on',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    hoverBg: 'hover:bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-500/50',
    activeBg: 'bg-purple-500/20',
    activeBorder: 'border-purple-500/60',
    ring: 'ring-purple-500/40',
    shadow: 'shadow-purple-500/20',
    gradient: 'from-purple-500/20 to-purple-600/20',
    pulseColor: 'animate-pulse-purple'
  },
  done: {
    icon: CheckCircle2,
    emoji: '✅',
    label: 'Done',
    actionLabel: 'Mark Complete',
    tooltip: 'Click to mark this task as "Done" - task has been completed',
    description: 'Task has been completed successfully',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    hoverBg: 'hover:bg-green-500/20',
    borderColor: 'border-green-500/30',
    hoverBorder: 'hover:border-green-500/50',
    activeBg: 'bg-green-500/20',
    activeBorder: 'border-green-500/60',
    ring: 'ring-green-500/40',
    shadow: 'shadow-green-500/20',
    gradient: 'from-green-500/20 to-green-600/20',
    pulseColor: 'animate-pulse-green'
  },
  blocked: {
    icon: XCircle,
    emoji: '🚫',
    label: 'Blocked',
    actionLabel: 'Mark Blocked',
    tooltip: 'Click to mark this task as "Blocked" - cannot proceed due to dependencies',
    description: 'Task cannot proceed due to dependencies or issues',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    hoverBg: 'hover:bg-red-500/20',
    borderColor: 'border-red-500/30',
    hoverBorder: 'hover:border-red-500/50',
    activeBg: 'bg-red-500/20',
    activeBorder: 'border-red-500/60',
    ring: 'ring-red-500/40',
    shadow: 'shadow-red-500/20',
    gradient: 'from-red-500/20 to-red-600/20',
    pulseColor: 'animate-pulse-red'
  }
}

export function TaskStatusButton({ 
  status, 
  currentStatus, 
  onClick, 
  compact = false,
  showAnimation = true 
}: TaskStatusButtonProps) {
  const config = statusConfig[status]
  const isActive = status === currentStatus
  const Icon = config.icon
  
  const button = (
    <Button
      size={compact ? "sm" : "default"}
      variant="ghost"
      onClick={onClick}
      disabled={isActive}
      aria-label={isActive ? `Current status: ${config.label}` : config.actionLabel}
      aria-describedby={`status-${status}-desc`}
      className={`
        relative overflow-hidden border-2 transition-all duration-300 transform
        ${isActive 
          ? `${config.activeBg} ${config.activeBorder} ring-2 ${config.ring} shadow-lg ${config.shadow} scale-105 cursor-default` 
          : `${config.bgColor} ${config.borderColor} ${config.hoverBg} ${config.hoverBorder} hover:scale-105 hover:shadow-md ${config.shadow}`
        }
        ${compact ? 'px-3 py-2 text-xs min-w-[90px]' : 'px-4 py-3 min-w-[140px]'}
        ${isActive && showAnimation ? config.pulseColor : ''}
        group
      `}
    >
      {/* Background gradient effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        <Icon 
          className={`
            ${config.color} 
            ${compact ? 'h-4 w-4' : 'h-5 w-5'}
            ${!isActive ? 'group-hover:rotate-12 transition-transform duration-300' : ''}
          `}
        />
        <span className={`
          ${compact ? 'text-xs' : 'text-sm'} 
          font-semibold
          ${isActive ? config.color : 'text-gray-300 group-hover:text-white'}
          transition-colors duration-200
        `}>
          {compact ? config.label.split(' ')[0] : config.label}
        </span>
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <>
          <span className="absolute top-1 right-1">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.activeBg} ${config.activeBorder} border`}></span>
            </span>
          </span>
          
          {/* Progress animation for in_progress status */}
          {status === 'in_progress' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-shimmer" />
          )}
        </>
      )}
      
      {/* Hidden description for screen readers */}
      <span id={`status-${status}-desc`} className="sr-only">
        {config.description}
      </span>
    </Button>
  )
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-gray-800 border-gray-700">
          <div className="text-center p-1">
            <p className="font-semibold text-sm flex items-center justify-center gap-2">
              <Icon className={`${config.color} h-4 w-4`} />
              {isActive ? `Current: ${config.label}` : config.actionLabel}
            </p>
            <p className="text-xs text-gray-400 mt-1">{config.tooltip}</p>
            {isActive && (
              <p className="text-xs text-green-400 mt-2 font-medium flex items-center justify-center gap-1">
                <Check className="h-3 w-3" /> Active Status
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function TaskStatusButtonGroup({ 
  currentStatus, 
  onStatusChange,
  compact = false,
  showAnimation = true,
  orientation = 'horizontal'
}: {
  currentStatus: 'todo' | 'in_progress' | 'done' | 'blocked'
  onStatusChange: (status: 'todo' | 'in_progress' | 'done' | 'blocked') => void
  compact?: boolean
  showAnimation?: boolean
  orientation?: 'horizontal' | 'vertical'
}) {
  const CurrentIcon = statusConfig[currentStatus].icon
  
  return (
    <div className="space-y-4">
      {/* Current status display */}
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Current Status:</span>
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md
            ${statusConfig[currentStatus].activeBg}
            ${statusConfig[currentStatus].activeBorder}
            border-2
          `}>
            <CurrentIcon className={`${statusConfig[currentStatus].color} h-4 w-4`} />
            <span className={`text-sm font-semibold ${statusConfig[currentStatus].color}`}>
              {statusConfig[currentStatus].label}
            </span>
          </div>
        </div>
        
        {/* Status indicator animation */}
        {currentStatus === 'in_progress' && showAnimation && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-500">Active</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse animation-delay-200"></span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse animation-delay-400"></span>
            </div>
          </div>
        )}
      </div>
      
      {/* Status change buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Change Status
          </span>
        </div>
        
        <div className={`
          ${orientation === 'horizontal' 
            ? `flex flex-wrap ${compact ? 'gap-2' : 'gap-3'}` 
            : 'flex flex-col gap-2'
          }
        `} role="group" aria-label="Task status options">
          {(['todo', 'in_progress', 'done', 'blocked'] as const).map((status) => (
            <TaskStatusButton
              key={status}
              status={status}
              currentStatus={currentStatus}
              onClick={() => onStatusChange(status)}
              compact={compact}
              showAnimation={showAnimation}
            />
          ))}
        </div>
      </div>
      
      {/* Status workflow hint */}
      <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
        <Zap className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-gray-400 space-y-1">
          <p className="font-medium text-blue-400">Workflow Tip:</p>
          <p>Todo → In Progress → Done (typical flow)</p>
          <p>Use "Blocked" when waiting for dependencies</p>
        </div>
      </div>
    </div>
  )
}

// Compact status indicator for lists and tables
export function TaskStatusIndicator({ 
  status,
  size = 'sm',
  showLabel = false 
}: {
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const config = statusConfig[status]
  const Icon = config.icon
  
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`
            inline-flex items-center gap-1.5 
            px-2 py-1 rounded-md
            ${config.bgColor} ${config.borderColor} border
          `}>
            <Icon className={`${config.color} ${sizeClasses[size]}`} />
            {showLabel && (
              <span className={`text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}