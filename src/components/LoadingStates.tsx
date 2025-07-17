import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, RefreshCw, Brain, Sparkles } from "lucide-react"

// Memory Card Skeleton with enhanced animation
export function MemoryCardSkeleton() {
  return (
    <div className="card-glass h-[200px] sm:h-[220px] space-card relative overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      <div className="relative animate-pulse flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Skeleton className="h-5 w-16 rounded bg-gray-700/50" />
            <Skeleton className="h-5 w-20 rounded bg-gray-700/40" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded bg-gray-700/30" />
            <Skeleton className="h-8 w-8 rounded bg-gray-700/30" />
          </div>
        </div>
        
        {/* Title and content */}
        <div className="flex-1 space-y-2 mb-3">
          <Skeleton className="h-5 w-full bg-gray-700/50" />
          <Skeleton className="h-4 w-4/5 bg-gray-700/40" />
          <Skeleton className="h-4 w-3/5 bg-gray-700/30" />
        </div>
        
        {/* Tags */}
        <div className="flex gap-1 mb-3">
          <Skeleton className="h-6 w-12 rounded-md bg-gray-700/30" />
          <Skeleton className="h-6 w-16 rounded-md bg-gray-700/30" />
          <Skeleton className="h-6 w-10 rounded-md bg-gray-700/30" />
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
          <Skeleton className="h-3 w-20 bg-gray-700/40" />
          <Skeleton className="h-3 w-12 bg-gray-700/30" />
        </div>
      </div>
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton() {
  return (
    <tr className="border-gray-700 animate-pulse">
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-48" />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </td>
    </tr>
  )
}

// Enhanced Full Page Loading with brain animation
export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px] flex-col gap-6">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-20 h-20 rounded-full border-2 border-violet-500/20 animate-spin-slow" />
        {/* Inner brain icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="h-10 w-10 text-violet-400 animate-pulse" />
        </div>
        {/* Sparkles */}
        <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-purple-400 animate-bounce" />
        <Sparkles className="absolute -bottom-2 -left-2 h-3 w-3 text-cyan-400 animate-bounce delay-300" />
      </div>
      <div className="text-center space-y-2">
        <div className="text-lg font-medium text-gray-300 animate-fade-in">Loading memories</div>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150" />
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-300" />
        </div>
      </div>
    </div>
  )
}

// Enhanced Refresh Indicator
export function RefreshSpinner({ className = "" }: { className?: string }) {
  return (
    <div className="relative">
      <RefreshCw className={`h-4 w-4 animate-spin text-violet-400 ${className}`} />
      <div className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping" />
    </div>
  )
}

// Enhanced Button Loading Spinner
export function ButtonSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"
  return (
    <div className="relative flex items-center justify-center">
      <Loader2 className={`${iconSize} animate-spin text-violet-400`} />
      <div className={`absolute inset-0 rounded-full bg-violet-400/10 animate-pulse`} />
    </div>
  )
}

// Memory Cards Grid Skeleton
export function MemoryCardsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid-responsive">
      {Array.from({ length: count }, (_, i) => (
        <MemoryCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Memory Table Skeleton
export function MemoryTableSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  )
}

// Empty State
export function EmptyState({ 
  title = "No memories found", 
  description = "Create your first memory to get started",
  icon = "🧠" 
}: { 
  title?: string
  description?: string  
  icon?: string
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] flex-col gap-4 text-center">
      <div className="text-6xl opacity-50">{icon}</div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-300">{title}</h3>
        <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      </div>
    </div>
  )
}