import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TaskStatusButtonProps {
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  currentStatus: 'todo' | 'in_progress' | 'done' | 'blocked'
  onClick: () => void
  compact?: boolean
}

const statusConfig = {
  todo: {
    icon: '⏳',
    label: 'To Do',
    tooltip: 'Mark as To Do - Task is waiting to be started',
    color: 'text-blue-400',
    bgColor: 'hover:bg-blue-500/20',
    borderColor: 'hover:border-blue-500/50'
  },
  in_progress: {
    icon: '🔄',
    label: 'In Progress',
    tooltip: 'Mark as In Progress - Task is currently being worked on',
    color: 'text-purple-400',
    bgColor: 'hover:bg-purple-500/20',
    borderColor: 'hover:border-purple-500/50'
  },
  done: {
    icon: '✅',
    label: 'Done',
    tooltip: 'Mark as Done - Task has been completed',
    color: 'text-green-400',
    bgColor: 'hover:bg-green-500/20',
    borderColor: 'hover:border-green-500/50'
  },
  blocked: {
    icon: '🚫',
    label: 'Blocked',
    tooltip: 'Mark as Blocked - Task cannot proceed due to dependencies or issues',
    color: 'text-red-400',
    bgColor: 'hover:bg-red-500/20',
    borderColor: 'hover:border-red-500/50'
  }
}

export function TaskStatusButton({ status, currentStatus, onClick, compact = false }: TaskStatusButtonProps) {
  const config = statusConfig[status]
  const isActive = status === currentStatus
  
  const button = (
    <Button
      size={compact ? "sm" : "default"}
      variant={isActive ? "default" : "outline"}
      onClick={onClick}
      disabled={isActive}
      className={`
        ${isActive ? '' : `${config.bgColor} ${config.borderColor}`}
        ${compact ? 'px-2 py-1 text-xs' : ''}
        transition-all duration-200
      `}
    >
      <span className={config.color}>{config.icon}</span>
      {!compact && <span className="ml-2">{config.label}</span>}
    </Button>
  )
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-gray-400">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return button
}

export function TaskStatusButtonGroup({ 
  currentStatus, 
  onStatusChange,
  compact = false 
}: {
  currentStatus: 'todo' | 'in_progress' | 'done' | 'blocked'
  onStatusChange: (status: 'todo' | 'in_progress' | 'done' | 'blocked') => void
  compact?: boolean
}) {
  return (
    <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
      {(['todo', 'in_progress', 'done', 'blocked'] as const).map((status) => (
        <TaskStatusButton
          key={status}
          status={status}
          currentStatus={currentStatus}
          onClick={() => onStatusChange(status)}
          compact={compact}
        />
      ))}
    </div>
  )
}