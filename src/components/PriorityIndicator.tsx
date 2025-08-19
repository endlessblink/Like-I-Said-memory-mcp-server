import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, Star, Clock, Eye, Target } from 'lucide-react';
import { PriorityScore, getPriorityLevel, getPriorityColor } from '@/utils/contentPrioritization';

interface PriorityIndicatorProps {
  score: PriorityScore;
  showDetails?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({
  score,
  showDetails = false,
  showIcon = true,
  size = 'md'
}) => {
  const level = getPriorityLevel(score.total);
  const colorClass = getPriorityColor(level);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const getPriorityIcon = () => {
    switch (level) {
      case 'critical': return <Target size={iconSizes[size]} />;
      case 'high': return <TrendingUp size={iconSizes[size]} />;
      case 'medium': return <Star size={iconSizes[size]} />;
      case 'low': return <Clock size={iconSizes[size]} />;
      default: return <Clock size={iconSizes[size]} />;
    }
  };

  const formatPercentage = (value: number) => Math.round(value * 100);

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">Priority Breakdown</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            Recency
          </span>
          <span className="font-mono">{formatPercentage(score.recency)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Star size={10} />
            Relevance
          </span>
          <span className="font-mono">{formatPercentage(score.relevance)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Eye size={10} />
            Interaction
          </span>
          <span className="font-mono">{formatPercentage(score.interaction)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Target size={10} />
            Importance
          </span>
          <span className="font-mono">{formatPercentage(score.importance)}%</span>
        </div>
        <div className="border-t border-border/20 pt-1 mt-2">
          <div className="flex justify-between font-medium">
            <span>Total Score</span>
            <span className="font-mono">{formatPercentage(score.total)}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const indicator = (
    <Badge 
      variant="outline" 
      className={`${colorClass} ${sizeClasses[size]} border rounded-md flex items-center gap-1 font-medium`}
    >
      {showIcon && getPriorityIcon()}
      {level.toUpperCase()}
      {showDetails && (
        <span className="ml-1 font-mono">
          {formatPercentage(score.total)}%
        </span>
      )}
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {indicator}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};

interface PriorityBarProps {
  score: PriorityScore;
  showLabels?: boolean;
}

export const PriorityBar: React.FC<PriorityBarProps> = ({
  score,
  showLabels = false
}) => {
  const level = getPriorityLevel(score.total);
  
  const getBarColor = () => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        {showLabels && (
          <>
            <span className="text-xs text-muted-foreground">Priority</span>
            <span className="text-xs font-mono text-muted-foreground">
              {Math.round(score.total * 100)}%
            </span>
          </>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.max(score.total * 100, 2)}%` }}
        />
      </div>
      {showLabels && (
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="text-center">
            <div className="font-mono">{Math.round(score.recency * 100)}%</div>
            <div className="text-muted-foreground">Recent</div>
          </div>
          <div className="text-center">
            <div className="font-mono">{Math.round(score.relevance * 100)}%</div>
            <div className="text-muted-foreground">Relevant</div>
          </div>
          <div className="text-center">
            <div className="font-mono">{Math.round(score.interaction * 100)}%</div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="font-mono">{Math.round(score.importance * 100)}%</div>
            <div className="text-muted-foreground">Important</div>
          </div>
        </div>
      )}
    </div>
  );
};