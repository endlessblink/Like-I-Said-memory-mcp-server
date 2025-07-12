import React from 'react'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface QualityBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  showLabel?: boolean
}

export function QualityBadge({ 
  score, 
  size = 'sm',
  showScore = false,
  showLabel = false 
}: QualityBadgeProps) {
  const getQualityLevel = (score: number) => {
    if (score >= 90) return { level: 'excellent', color: 'bg-green-500', icon: CheckCircle, label: 'Excellent' }
    if (score >= 70) return { level: 'good', color: 'bg-yellow-500', icon: CheckCircle, label: 'Good' }
    if (score >= 60) return { level: 'fair', color: 'bg-orange-500', icon: AlertCircle, label: 'Fair' }
    if (score >= 40) return { level: 'poor', color: 'bg-red-500', icon: XCircle, label: 'Poor' }
    return { level: 'critical', color: 'bg-red-700', icon: XCircle, label: 'Critical' }
  }

  const quality = getQualityLevel(score)
  const Icon = quality.icon

  const sizeClasses = {
    sm: 'h-4 w-4 text-xs',
    md: 'h-5 w-5 text-sm',
    lg: 'h-6 w-6 text-base'
  }

  const badgeClasses = {
    sm: 'px-1.5 py-0.5',
    md: 'px-2 py-1',
    lg: 'px-3 py-1.5'
  }

  return (
    <div className={`inline-flex items-center gap-1 ${quality.color} text-white rounded ${badgeClasses[size]}`}>
      <Icon className={sizeClasses[size]} />
      {showLabel && <span className={sizeClasses[size]}>{quality.label}</span>}
      {showScore && <span className={`${sizeClasses[size]} font-mono`}>{score}</span>}
    </div>
  )
}