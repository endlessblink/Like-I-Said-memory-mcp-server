import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

interface StatusIconProps {
  status: TaskStatus
  showTooltip?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  todo: {
    icon: '⏳',
    label: 'To Do',
    description: 'Task is waiting to be started',
    color: 'text-blue-400'
  },
  in_progress: {
    icon: '🔄',
    label: 'In Progress', 
    description: 'Task is currently being worked on',
    color: 'text-purple-400'
  },
  done: {
    icon: '✅',
    label: 'Done',
    description: 'Task has been completed',
    color: 'text-green-400'
  },
  blocked: {
    icon: '🚫',
    label: 'Blocked',
    description: 'Task cannot proceed due to dependencies or issues',
    color: 'text-red-400'
  }
}

export function StatusIcon({ status, showTooltip = true, className = '', size = 'md' }: StatusIconProps) {
  const config = statusConfig[status]
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg'
  }
  
  const iconElement = (
    <span 
      className={`${config.color} ${sizeClasses[size]} ${className}`}
      aria-label={`${config.label}: ${config.description}`}
    >
      {config.icon}
    </span>
  )
  
  if (!showTooltip) {
    return iconElement
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">
            {iconElement}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-gray-400">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Helper function to get just the icon without tooltip (for backwards compatibility)
export function getStatusIcon(status: TaskStatus): string {
  return statusConfig[status]?.icon || '❓'
}

// Helper function to get status color
export function getStatusColor(status: TaskStatus): string {
  return statusConfig[status]?.color || 'text-gray-400'
}

// Helper function to get status label
export function getStatusLabel(status: TaskStatus): string {
  return statusConfig[status]?.label || 'Unknown'
}