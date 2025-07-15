/**
 * Task Analytics & Insights System
 * Provides comprehensive analytics and progress tracking for task management
 */

export class TaskAnalytics {
  
  /**
   * Generate comprehensive task status analytics
   * @param {Object} taskStorage - Task storage instance
   * @param {Object} options - Analytics options
   * @returns {Object} Complete analytics report
   */
  static async generateStatusAnalytics(taskStorage, options = {}) {
    const {
      project = null,
      timeRange = 'week',
      includeTrends = true,
      includeRecommendations = true,
      includeProjectBreakdown = true
    } = options;

    try {
      const allTasks = taskStorage.getAllTasks();
      const filteredTasks = project ? allTasks.filter(t => t.project === project) : allTasks;
      
      const analytics = {
        overview: this.generateOverview(filteredTasks),
        status_breakdown: this.generateStatusBreakdown(filteredTasks),
        priority_analysis: this.generatePriorityAnalysis(filteredTasks),
        project_analysis: includeProjectBreakdown ? this.generateProjectAnalysis(allTasks) : null,
        time_analysis: this.generateTimeAnalysis(filteredTasks, timeRange),
        trends: includeTrends ? this.generateTrends(filteredTasks, timeRange) : null,
        productivity_metrics: this.generateProductivityMetrics(filteredTasks, timeRange),
        workflow_insights: this.generateWorkflowInsights(filteredTasks),
        recommendations: includeRecommendations ? this.generateRecommendations(filteredTasks, allTasks) : null,
        generated_at: new Date().toISOString(),
        scope: project ? `Project: ${project}` : 'All projects',
        time_range: timeRange
      };

      return analytics;

    } catch (error) {
      console.error('Error generating task analytics:', error);
      return {
        error: 'Failed to generate analytics',
        message: error.message,
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Generate high-level overview statistics
   */
  static generateOverview(tasks) {
    const total = tasks.length;
    const statusCounts = this.countByStatus(tasks);
    const priorityCounts = this.countByPriority(tasks);
    
    return {
      total_tasks: total,
      completion_rate: total > 0 ? Math.round((statusCounts.done / total) * 100) : 0,
      active_tasks: statusCounts.todo + statusCounts.in_progress,
      blocked_tasks: statusCounts.blocked,
      status_distribution: statusCounts,
      priority_distribution: priorityCounts,
      health_score: this.calculateHealthScore(statusCounts, priorityCounts, total)
    };
  }

  /**
   * Generate detailed status breakdown with insights
   */
  static generateStatusBreakdown(tasks) {
    const breakdown = {
      todo: {
        count: 0,
        percentage: 0,
        avg_age_days: 0,
        urgent_count: 0,
        stale_count: 0, // >7 days in todo
        tasks: []
      },
      in_progress: {
        count: 0,
        percentage: 0,
        avg_age_days: 0,
        long_running: 0, // >7 days in progress
        with_subtasks: 0,
        tasks: []
      },
      done: {
        count: 0,
        percentage: 0,
        recent_completions: 0, // last 7 days
        avg_completion_time: 0,
        tasks: []
      },
      blocked: {
        count: 0,
        percentage: 0,
        avg_blocked_time: 0,
        needs_attention: 0, // >3 days blocked
        tasks: []
      }
    };

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);

    tasks.forEach(task => {
      const status = task.status;
      const created = new Date(task.created).getTime();
      const updated = new Date(task.updated).getTime();
      const ageDays = (now - created) / (1000 * 60 * 60 * 24);
      
      if (breakdown[status]) {
        breakdown[status].count++;
        breakdown[status].tasks.push({
          id: task.id,
          serial: task.serial,
          title: task.title,
          priority: task.priority,
          age_days: Math.floor(ageDays),
          project: task.project
        });

        // Status-specific calculations
        switch (status) {
          case 'todo':
            if (task.priority === 'urgent') breakdown.todo.urgent_count++;
            if (created < sevenDaysAgo) breakdown.todo.stale_count++;
            break;
            
          case 'in_progress':
            if (created < sevenDaysAgo) breakdown.in_progress.long_running++;
            if (task.subtasks && task.subtasks.length > 0) breakdown.in_progress.with_subtasks++;
            break;
            
          case 'done':
            if (updated > sevenDaysAgo) breakdown.done.recent_completions++;
            break;
            
          case 'blocked':
            if (updated < threeDaysAgo) breakdown.blocked.needs_attention++;
            break;
        }
      }
    });

    // Calculate percentages and averages
    const total = tasks.length;
    Object.keys(breakdown).forEach(status => {
      const data = breakdown[status];
      data.percentage = total > 0 ? Math.round((data.count / total) * 100) : 0;
      
      if (data.count > 0) {
        data.avg_age_days = Math.round(
          data.tasks.reduce((sum, task) => sum + task.age_days, 0) / data.count
        );
      }
    });

    return breakdown;
  }

  /**
   * Generate priority-based analysis
   */
  static generatePriorityAnalysis(tasks) {
    const analysis = {
      urgent: { count: 0, todo: 0, in_progress: 0, blocked: 0, done: 0 },
      high: { count: 0, todo: 0, in_progress: 0, blocked: 0, done: 0 },
      medium: { count: 0, todo: 0, in_progress: 0, blocked: 0, done: 0 },
      low: { count: 0, todo: 0, in_progress: 0, blocked: 0, done: 0 }
    };

    tasks.forEach(task => {
      const priority = task.priority || 'medium';
      const status = task.status;
      
      if (analysis[priority]) {
        analysis[priority].count++;
        analysis[priority][status]++;
      }
    });

    // Calculate completion rates by priority
    Object.keys(analysis).forEach(priority => {
      const data = analysis[priority];
      data.completion_rate = data.count > 0 ? Math.round((data.done / data.count) * 100) : 0;
      data.active_rate = data.count > 0 ? Math.round(((data.todo + data.in_progress) / data.count) * 100) : 0;
    });

    return analysis;
  }

  /**
   * Generate project-based analysis
   */
  static generateProjectAnalysis(tasks) {
    const projects = {};
    
    tasks.forEach(task => {
      const project = task.project || 'default';
      
      if (!projects[project]) {
        projects[project] = {
          total_tasks: 0,
          todo: 0,
          in_progress: 0,
          done: 0,
          blocked: 0,
          completion_rate: 0,
          avg_priority_score: 0,
          last_activity: null
        };
      }
      
      const proj = projects[project];
      proj.total_tasks++;
      proj[task.status]++;
      
      // Track last activity
      const taskUpdated = new Date(task.updated);
      if (!proj.last_activity || taskUpdated > new Date(proj.last_activity)) {
        proj.last_activity = task.updated;
      }
    });

    // Calculate derived metrics
    Object.keys(projects).forEach(projectName => {
      const proj = projects[projectName];
      proj.completion_rate = proj.total_tasks > 0 ? Math.round((proj.done / proj.total_tasks) * 100) : 0;
      
      // Calculate average priority score (urgent=4, high=3, medium=2, low=1)
      const priorityTasks = tasks.filter(t => (t.project || 'default') === projectName);
      const prioritySum = priorityTasks.reduce((sum, task) => {
        const scores = { urgent: 4, high: 3, medium: 2, low: 1 };
        return sum + (scores[task.priority] || 2);
      }, 0);
      proj.avg_priority_score = priorityTasks.length > 0 ? Math.round((prioritySum / priorityTasks.length) * 10) / 10 : 2.0;
    });

    return projects;
  }

  /**
   * Generate time-based analysis
   */
  static generateTimeAnalysis(tasks, timeRange) {
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    
    const recentTasks = tasks.filter(task => 
      new Date(task.created).getTime() > cutoffTime ||
      new Date(task.updated).getTime() > cutoffTime
    );

    const analysis = {
      time_range: timeRange,
      total_tasks_in_range: recentTasks.length,
      created_in_range: tasks.filter(t => new Date(t.created).getTime() > cutoffTime).length,
      completed_in_range: tasks.filter(t => 
        t.status === 'done' && new Date(t.updated).getTime() > cutoffTime
      ).length,
      avg_completion_time_hours: 0,
      activity_by_day: this.getActivityByDay(recentTasks, timeRange)
    };

    // Calculate average completion time for tasks completed in range
    const completedTasks = tasks.filter(t => 
      t.status === 'done' && 
      new Date(t.updated).getTime() > cutoffTime &&
      t.created && t.updated
    );

    if (completedTasks.length > 0) {
      const totalCompletionTime = completedTasks.reduce((sum, task) => {
        const created = new Date(task.created).getTime();
        const completed = new Date(task.updated).getTime();
        return sum + (completed - created);
      }, 0);
      
      analysis.avg_completion_time_hours = Math.round(
        (totalCompletionTime / completedTasks.length) / (1000 * 60 * 60) * 10
      ) / 10;
    }

    return analysis;
  }

  /**
   * Generate trend analysis
   */
  static generateTrends(tasks, timeRange) {
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const now = Date.now();
    const periods = this.getTrendPeriods(timeRange);
    
    const trends = {
      completion_trend: [],
      creation_trend: [],
      status_trends: {
        todo: [],
        in_progress: [],
        done: [],
        blocked: []
      },
      velocity: {
        tasks_per_day: 0,
        completion_rate_change: 0
      }
    };

    periods.forEach(period => {
      const periodStart = now - (period.offset * timeRangeMs / periods.length);
      const periodEnd = now - ((period.offset - 1) * timeRangeMs / periods.length);
      
      const createdInPeriod = tasks.filter(t => {
        const created = new Date(t.created).getTime();
        return created >= periodStart && created < periodEnd;
      }).length;
      
      const completedInPeriod = tasks.filter(t => {
        const updated = new Date(t.updated).getTime();
        return t.status === 'done' && updated >= periodStart && updated < periodEnd;
      }).length;
      
      trends.creation_trend.push({
        period: period.label,
        count: createdInPeriod
      });
      
      trends.completion_trend.push({
        period: period.label,
        count: completedInPeriod
      });
    });

    // Calculate velocity
    const totalDays = timeRangeMs / (1000 * 60 * 60 * 24);
    const recentCompletions = trends.completion_trend.reduce((sum, period) => sum + period.count, 0);
    trends.velocity.tasks_per_day = Math.round((recentCompletions / totalDays) * 10) / 10;

    return trends;
  }

  /**
   * Generate productivity metrics
   */
  static generateProductivityMetrics(tasks, timeRange) {
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    
    const recentTasks = tasks.filter(task => 
      new Date(task.updated).getTime() > cutoffTime
    );

    const metrics = {
      throughput: 0, // tasks completed per day
      cycle_time_avg: 0, // average time from start to completion
      lead_time_avg: 0, // average time from creation to completion
      work_in_progress: tasks.filter(t => t.status === 'in_progress').length,
      blocked_percentage: 0,
      rework_rate: 0, // tasks that went from done back to other statuses
      focus_score: 0 // percentage of time spent on high-priority tasks
    };

    // Calculate throughput
    const completedRecently = recentTasks.filter(t => t.status === 'done');
    const days = timeRangeMs / (1000 * 60 * 60 * 24);
    metrics.throughput = Math.round((completedRecently.length / days) * 10) / 10;

    // Calculate blocked percentage
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    metrics.blocked_percentage = tasks.length > 0 ? Math.round((blockedTasks.length / tasks.length) * 100) : 0;

    // Calculate focus score (time on high-priority tasks)
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
    metrics.focus_score = tasks.length > 0 ? Math.round((highPriorityTasks.length / tasks.length) * 100) : 0;

    return metrics;
  }

  /**
   * Generate workflow insights
   */
  static generateWorkflowInsights(tasks) {
    const insights = {
      bottlenecks: [],
      patterns: [],
      recommendations: [],
      risk_factors: []
    };

    // Identify bottlenecks
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      insights.bottlenecks.push({
        type: 'blocked_tasks',
        severity: blockedTasks.length > 5 ? 'high' : 'medium',
        description: `${blockedTasks.length} tasks currently blocked`,
        affected_tasks: blockedTasks.length
      });
    }

    const longRunningTasks = tasks.filter(t => {
      if (t.status !== 'in_progress') return false;
      const created = new Date(t.created).getTime();
      const daysSinceCreated = (Date.now() - created) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 7;
    });

    if (longRunningTasks.length > 0) {
      insights.bottlenecks.push({
        type: 'long_running_tasks',
        severity: 'medium',
        description: `${longRunningTasks.length} tasks in progress for >7 days`,
        affected_tasks: longRunningTasks.length
      });
    }

    // Identify patterns
    const projectCounts = {};
    tasks.forEach(task => {
      const project = task.project || 'default';
      projectCounts[project] = (projectCounts[project] || 0) + 1;
    });

    const dominantProject = Object.keys(projectCounts).reduce((a, b) => 
      projectCounts[a] > projectCounts[b] ? a : b
    );

    if (projectCounts[dominantProject] > tasks.length * 0.6) {
      insights.patterns.push({
        type: 'project_concentration',
        description: `${Math.round((projectCounts[dominantProject] / tasks.length) * 100)}% of tasks in ${dominantProject} project`,
        project: dominantProject
      });
    }

    // Risk factors
    const urgentTodoTasks = tasks.filter(t => t.status === 'todo' && t.priority === 'urgent');
    if (urgentTodoTasks.length > 0) {
      insights.risk_factors.push({
        type: 'urgent_tasks_not_started',
        severity: 'high',
        description: `${urgentTodoTasks.length} urgent tasks not yet started`,
        count: urgentTodoTasks.length
      });
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  static generateRecommendations(filteredTasks, allTasks) {
    const recommendations = [];

    // Completion rate recommendations
    const completionRate = this.calculateCompletionRate(filteredTasks);
    if (completionRate < 30) {
      recommendations.push({
        type: 'low_completion_rate',
        priority: 'high',
        title: 'Improve Task Completion Rate',
        description: `Current completion rate is ${completionRate}%. Consider breaking large tasks into smaller chunks.`,
        action: 'Break down large tasks into subtasks and focus on completing one thing at a time'
      });
    }

    // Blocked tasks recommendations
    const blockedTasks = filteredTasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 3) {
      recommendations.push({
        type: 'too_many_blocked',
        priority: 'high',
        title: 'Address Blocked Tasks',
        description: `${blockedTasks.length} tasks are currently blocked.`,
        action: 'Review blocked tasks and identify what can be unblocked or worked around'
      });
    }

    // Priority distribution recommendations
    const urgentTasks = filteredTasks.filter(t => t.priority === 'urgent');
    const totalTasks = filteredTasks.length;
    if (urgentTasks.length > totalTasks * 0.3) {
      recommendations.push({
        type: 'too_many_urgent',
        priority: 'medium',
        title: 'Review Priority Assignment',
        description: `${Math.round((urgentTasks.length / totalTasks) * 100)}% of tasks are marked urgent.`,
        action: 'Review and reassess task priorities to ensure urgent really means urgent'
      });
    }

    // Work in progress recommendations
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
    if (inProgressTasks.length > 5) {
      recommendations.push({
        type: 'too_much_wip',
        priority: 'medium',
        title: 'Reduce Work in Progress',
        description: `${inProgressTasks.length} tasks currently in progress.`,
        action: 'Focus on completing current tasks before starting new ones'
      });
    }

    // Stale tasks recommendations
    const staleTasks = filteredTasks.filter(t => {
      const updated = new Date(t.updated).getTime();
      const daysSinceUpdate = (Date.now() - updated) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 14;
    });

    if (staleTasks.length > 0) {
      recommendations.push({
        type: 'stale_tasks',
        priority: 'low',
        title: 'Review Stale Tasks',
        description: `${staleTasks.length} tasks haven't been updated in 2+ weeks.`,
        action: 'Review these tasks to see if they are still relevant or need to be closed'
      });
    }

    return recommendations;
  }

  /**
   * Helper: Count tasks by status
   */
  static countByStatus(tasks) {
    return tasks.reduce((counts, task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
      return counts;
    }, { todo: 0, in_progress: 0, done: 0, blocked: 0 });
  }

  /**
   * Helper: Count tasks by priority
   */
  static countByPriority(tasks) {
    return tasks.reduce((counts, task) => {
      const priority = task.priority || 'medium';
      counts[priority] = (counts[priority] || 0) + 1;
      return counts;
    }, { urgent: 0, high: 0, medium: 0, low: 0 });
  }

  /**
   * Helper: Calculate health score
   */
  static calculateHealthScore(statusCounts, priorityCounts, total) {
    if (total === 0) return 100;

    let score = 70; // Base score

    // Completion rate bonus
    const completionRate = statusCounts.done / total;
    score += completionRate * 20;

    // Blocked tasks penalty
    const blockedRate = statusCounts.blocked / total;
    score -= blockedRate * 30;

    // Urgent tasks penalty if too many
    const urgentRate = priorityCounts.urgent / total;
    if (urgentRate > 0.2) {
      score -= (urgentRate - 0.2) * 50;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Helper: Calculate completion rate
   */
  static calculateCompletionRate(tasks) {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'done');
    return Math.round((completedTasks.length / tasks.length) * 100);
  }

  /**
   * Helper: Get time range in milliseconds
   */
  static getTimeRangeMs(timeRange) {
    const ranges = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000
    };
    return ranges[timeRange] || ranges.week;
  }

  /**
   * Helper: Get activity by day
   */
  static getActivityByDay(tasks, timeRange) {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 7;
    const activity = [];
    
    for (let i = 0; i < days; i++) {
      const dayStart = Date.now() - (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      
      const dayActivity = tasks.filter(task => {
        const updated = new Date(task.updated).getTime();
        return updated >= dayStart && updated < dayEnd;
      }).length;

      activity.unshift({
        date: new Date(dayStart).toISOString().split('T')[0],
        activity_count: dayActivity
      });
    }
    
    return activity;
  }

  /**
   * Helper: Get trend periods
   */
  static getTrendPeriods(timeRange) {
    switch (timeRange) {
      case 'week':
        return [
          { label: '6-7 days ago', offset: 7 },
          { label: '4-5 days ago', offset: 5 },
          { label: '2-3 days ago', offset: 3 },
          { label: 'Last 1-2 days', offset: 1 }
        ];
      case 'month':
        return [
          { label: 'Week 4', offset: 4 },
          { label: 'Week 3', offset: 3 },
          { label: 'Week 2', offset: 2 },
          { label: 'Week 1', offset: 1 }
        ];
      default:
        return [
          { label: 'Earlier', offset: 2 },
          { label: 'Recent', offset: 1 }
        ];
    }
  }
}