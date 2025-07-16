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
    icon: '📋',
    label: 'To Do',
    actionLabel: 'Move to To Do',
    tooltip: 'Click to mark this task as "To Do" - ready to be started',
    description: 'Task is waiting to be started',
    color: 'text-blue-400',
    bgColor: 'hover:bg-blue-500/20',
    borderColor: 'hover:border-blue-500/50',
    activeBg: 'bg-blue-500/30 border-blue-500/60',
    ring: 'ring-blue-500/50'
  },
  in_progress: {
    icon: '⚡',
    label: 'In Progress', 
    actionLabel: 'Start Working',
    tooltip: 'Click to mark this task as "In Progress" - currently being worked on',
    description: 'Task is currently being worked on',
    color: 'text-purple-400',
    bgColor: 'hover:bg-purple-500/20',
    borderColor: 'hover:border-purple-500/50',
    activeBg: 'bg-purple-500/30 border-purple-500/60',
    ring: 'ring-purple-500/50'
  },
  done: {
    icon: '✓',
    label: 'Done',
    actionLabel: 'Mark Complete',
    tooltip: 'Click to mark this task as "Done" - task has been completed',
    description: 'Task has been completed successfully',
    color: 'text-green-400',
    bgColor: 'hover:bg-green-500/20',
    borderColor: 'hover:border-green-500/50',
    activeBg: 'bg-green-500/30 border-green-500/60',
    ring: 'ring-green-500/50'
  },
  blocked: {
    icon: '⚠',
    label: 'Blocked',
    actionLabel: 'Mark Blocked',
    tooltip: 'Click to mark this task as "Blocked" - cannot proceed due to dependencies',
    description: 'Task cannot proceed due to dependencies or issues',
    color: 'text-red-400',
    bgColor: 'hover:bg-red-500/20',
    borderColor: 'hover:border-red-500/50',
    activeBg: 'bg-red-500/30 border-red-500/60',
    ring: 'ring-red-500/50'
  }
}

export function TaskStatusButton({ status, currentStatus, onClick, compact = false }: TaskStatusButtonProps) {
  const config = statusConfig[status]
  const isActive = status === currentStatus
  const isCurrent = status === currentStatus
  
  const button = (
    <Button
      size={compact ? "sm" : "default"}
      variant={isActive ? "default" : "outline"}
      onClick={onClick}
      disabled={isActive}
      aria-label={isActive ? `Current status: ${config.label}` : config.actionLabel}
      aria-describedby={`status-${status}-desc`}
      className={`
        ${isActive 
          ? `${config.activeBg} ring-2 ${config.ring} shadow-lg` 
          : `${config.bgColor} ${config.borderColor} hover:ring-2 ${config.ring}`
        }
        ${compact ? 'px-3 py-2 text-xs min-w-[60px]' : 'px-4 py-2 min-w-[120px]'}
        transition-all duration-200 relative group
        ${isActive ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      <span className={`${config.color} ${compact ? 'text-sm' : 'text-base'} font-semibold mr-2`}>
        {config.icon}
      </span>
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>
        {isActive ? config.label : (compact ? config.label : config.actionLabel)}
      </span>
      
      {/* Status indicator for active state */}
      {isActive && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm" />
      )}
      
      {/* Hidden description for screen readers */}
      <span id={`status-${status}-desc`} className="sr-only">
        {config.description}
      </span>
    </Button>
  )
  
  // Always wrap with tooltip for better UX
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-center">
            <p className="font-semibold text-sm flex items-center gap-2">
              <span className={config.color}>{config.icon}</span>
              {isActive ? `Current: ${config.label}` : config.actionLabel}
            </p>
            <p className="text-xs text-gray-300 mt-1">{config.tooltip}</p>
            {isActive && (
              <p className="text-xs text-green-400 mt-1 font-medium">✓ Active Status</p>
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
  compact = false 
}: {
  currentStatus: 'todo' | 'in_progress' | 'done' | 'blocked'
  onStatusChange: (status: 'todo' | 'in_progress' | 'done' | 'blocked') => void
  compact?: boolean
}) {
  return (
    <div className="space-y-3">
      {/* Header with current status */}
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>Current Status:</span>
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
          statusConfig[currentStatus].activeBg
        } ${statusConfig[currentStatus].color}`}>
          {statusConfig[currentStatus].icon} {statusConfig[currentStatus].label}
        </span>
      </div>
      
      {/* Action buttons */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Change Status To:
        </div>
        <div className={`flex flex-wrap ${compact ? 'gap-2' : 'gap-3'}`} role="group" aria-label="Task status options">
          {(['todo', 'in_progress', 'done', 'blocked'] as const)
            .filter(status => status !== currentStatus)
            .map((status) => (
            <TaskStatusButton
              key={status}
              status={status}
              currentStatus={currentStatus}
              onClick={() => onStatusChange(status)}
              compact={compact}
            />
          ))}
        </div>
      </div>
      
      {/* Help text */}
      <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded-md border border-gray-700">
        💡 Tip: Click any button above to change the task status. The current status is highlighted and cannot be changed to itself.
      </div>
    </div>
  )
}