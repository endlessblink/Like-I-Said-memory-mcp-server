/**
 * Analytics Tools Plugin
 * Provides usage analytics and insights
 */

export default {
  name: 'analytics-tools',
  version: '1.0.0',
  description: 'Analytics and insights for memory and task usage',

  async initialize(serviceRegistry) {
    this.serviceRegistry = serviceRegistry;
    this.storage = await serviceRegistry.get('storage');
    this.taskStorage = await serviceRegistry.get('taskStorage');
    this.startTime = Date.now();
    this.metrics = {
      memories: { created: 0, retrieved: 0, searched: 0, deleted: 0 },
      tasks: { created: 0, updated: 0, completed: 0, deleted: 0 },
      queries: []
    };
  },

  tools: {
    get_analytics: {
      schema: {
        description: 'Get analytics and usage statistics',
        inputSchema: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['today', 'week', 'month', 'all'],
              description: 'Time period for analytics'
            },
            type: {
              type: 'string',
              enum: ['summary', 'detailed', 'trends'],
              description: 'Type of analytics report'
            }
          }
        }
      },
      async handler(args) {
        const period = args.period || 'all';
        const type = args.type || 'summary';
        
        // Get all memories and tasks
        const memories = await this.storage.listMemories();
        const tasks = await this.taskStorage.listTasks();
        
        // Filter by period
        const now = Date.now();
        const periodMs = {
          today: 24 * 60 * 60 * 1000,
          week: 7 * 24 * 60 * 60 * 1000,
          month: 30 * 24 * 60 * 60 * 1000,
          all: Infinity
        }[period];
        
        const recentMemories = memories.filter(m => 
          now - new Date(m.timestamp).getTime() < periodMs
        );
        
        const recentTasks = tasks.filter(t => 
          now - new Date(t.created).getTime() < periodMs
        );
        
        // Calculate analytics
        const analytics = {
          period,
          timestamp: new Date().toISOString(),
          memories: {
            total: recentMemories.length,
            by_category: this.groupBy(recentMemories, 'category'),
            by_complexity: this.groupBy(recentMemories, 'complexity'),
            by_project: this.groupBy(recentMemories, 'project'),
            recent: recentMemories.slice(0, 5).map(m => ({
              id: m.id,
              timestamp: m.timestamp,
              category: m.category,
              complexity: m.complexity
            }))
          },
          tasks: {
            total: recentTasks.length,
            by_status: this.groupBy(recentTasks, 'status'),
            by_priority: this.groupBy(recentTasks, 'priority'),
            by_project: this.groupBy(recentTasks, 'project'),
            completion_rate: this.calculateCompletionRate(recentTasks),
            active: recentTasks.filter(t => t.status === 'in_progress').length,
            blocked: recentTasks.filter(t => t.status === 'blocked').length
          }
        };
        
        if (type === 'detailed') {
          analytics.top_tags = this.getTopTags(recentMemories);
          analytics.productivity_score = this.calculateProductivityScore(recentTasks);
          analytics.memory_growth = this.calculateGrowthRate(recentMemories);
        }
        
        if (type === 'trends') {
          analytics.trends = {
            memory_creation: this.calculateTrend(recentMemories, 'timestamp'),
            task_completion: this.calculateTrend(
              recentTasks.filter(t => t.status === 'done'),
              'updated'
            )
          };
        }
        
        return analytics;
      }
    },

    get_insights: {
      schema: {
        description: 'Get actionable insights from usage patterns',
        inputSchema: {
          type: 'object',
          properties: {
            focus: {
              type: 'string',
              enum: ['productivity', 'knowledge', 'projects'],
              description: 'Focus area for insights'
            }
          }
        }
      },
      async handler(args) {
        const focus = args.focus || 'productivity';
        const memories = await this.storage.listMemories();
        const tasks = await this.taskStorage.listTasks();
        
        const insights = {
          focus,
          timestamp: new Date().toISOString(),
          insights: []
        };
        
        if (focus === 'productivity') {
          // Productivity insights
          const incompleteTasks = tasks.filter(t => t.status !== 'done');
          const blockedTasks = tasks.filter(t => t.status === 'blocked');
          const highPriorityIncomplete = incompleteTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
          
          if (blockedTasks.length > 0) {
            insights.insights.push({
              type: 'warning',
              title: 'Blocked Tasks',
              message: `You have ${blockedTasks.length} blocked tasks that need attention`,
              tasks: blockedTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title }))
            });
          }
          
          if (highPriorityIncomplete.length > 0) {
            insights.insights.push({
              type: 'priority',
              title: 'High Priority Tasks',
              message: `${highPriorityIncomplete.length} high-priority tasks awaiting completion`,
              tasks: highPriorityIncomplete.slice(0, 5).map(t => ({ id: t.id, title: t.title }))
            });
          }
          
          const completionRate = this.calculateCompletionRate(tasks);
          insights.insights.push({
            type: 'metric',
            title: 'Task Completion Rate',
            message: `Your completion rate is ${completionRate}%`,
            recommendation: completionRate < 50 
              ? 'Consider breaking down large tasks into smaller ones'
              : 'Great job maintaining productivity!'
          });
        }
        
        if (focus === 'knowledge') {
          // Knowledge management insights
          const categoryCounts = this.groupBy(memories, 'category');
          const dominantCategory = Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)[0];
          
          insights.insights.push({
            type: 'pattern',
            title: 'Knowledge Focus',
            message: `Most memories are in category: ${dominantCategory[0]} (${dominantCategory[1]} entries)`,
            recommendation: 'Consider diversifying knowledge capture across categories'
          });
          
          const complexMemories = memories.filter(m => m.complexity >= 3);
          insights.insights.push({
            type: 'metric',
            title: 'Knowledge Depth',
            message: `${complexMemories.length} complex memories (${Math.round((complexMemories.length / memories.length) * 100)}% of total)`,
            recommendation: complexMemories.length < memories.length * 0.2
              ? 'Consider capturing more detailed, complex knowledge'
              : 'Good balance of simple and complex knowledge'
          });
          
          // Tag analysis
          const tags = memories.flatMap(m => m.tags || []);
          const tagFrequency = {};
          tags.forEach(tag => {
            tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
          });
          
          const topTags = Object.entries(tagFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
          
          insights.insights.push({
            type: 'tags',
            title: 'Top Knowledge Areas',
            message: 'Most frequently tagged topics',
            tags: topTags.map(([tag, count]) => ({ tag, count }))
          });
        }
        
        if (focus === 'projects') {
          // Project insights
          const projectMemories = this.groupBy(memories, 'project');
          const projectTasks = this.groupBy(tasks, 'project');
          
          const projects = [...new Set([
            ...Object.keys(projectMemories),
            ...Object.keys(projectTasks)
          ])];
          
          const projectStats = projects.map(project => ({
            name: project,
            memories: projectMemories[project] || 0,
            tasks: projectTasks[project] || 0,
            taskCompletion: this.calculateCompletionRate(
              tasks.filter(t => t.project === project)
            )
          })).sort((a, b) => (b.memories + b.tasks) - (a.memories + a.tasks));
          
          insights.insights.push({
            type: 'projects',
            title: 'Project Activity',
            message: `Active across ${projects.length} projects`,
            projects: projectStats.slice(0, 5)
          });
          
          // Find stale projects
          const staleProjects = projectStats.filter(p => 
            p.taskCompletion === 100 || p.tasks === 0
          );
          
          if (staleProjects.length > 0) {
            insights.insights.push({
              type: 'info',
              title: 'Completed Projects',
              message: `${staleProjects.length} projects appear complete or inactive`,
              projects: staleProjects.slice(0, 3).map(p => p.name)
            });
          }
        }
        
        return insights;
      }
    },

    generate_report: {
      schema: {
        description: 'Generate a comprehensive analytics report',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['text', 'markdown', 'json'],
              description: 'Report format'
            }
          }
        }
      },
      async handler(args) {
        const format = args.format || 'markdown';
        
        // Gather all data
        const analytics = await this.tools.get_analytics.handler.call(this, {
          period: 'all',
          type: 'detailed'
        });
        
        const insights = await this.tools.get_insights.handler.call(this, {
          focus: 'productivity'
        });
        
        if (format === 'json') {
          return { analytics, insights };
        }
        
        // Generate markdown report
        const report = [
          '# Like-I-Said Analytics Report',
          `Generated: ${new Date().toISOString()}`,
          '',
          '## Summary Statistics',
          `- Total Memories: ${analytics.memories.total}`,
          `- Total Tasks: ${analytics.tasks.total}`,
          `- Active Tasks: ${analytics.tasks.active}`,
          `- Blocked Tasks: ${analytics.tasks.blocked}`,
          `- Task Completion Rate: ${analytics.tasks.completion_rate}%`,
          '',
          '## Memory Distribution',
          '### By Category',
          ...Object.entries(analytics.memories.by_category)
            .map(([cat, count]) => `- ${cat}: ${count}`),
          '',
          '### By Complexity',
          ...Object.entries(analytics.memories.by_complexity)
            .map(([level, count]) => `- Level ${level}: ${count}`),
          '',
          '## Task Distribution',
          '### By Status',
          ...Object.entries(analytics.tasks.by_status)
            .map(([status, count]) => `- ${status}: ${count}`),
          '',
          '### By Priority',
          ...Object.entries(analytics.tasks.by_priority)
            .map(([priority, count]) => `- ${priority}: ${count}`),
          '',
          '## Insights',
          ...insights.insights.map(insight => [
            `### ${insight.title}`,
            insight.message,
            insight.recommendation || '',
            ''
          ]).flat(),
          '',
          '## Recommendations',
          this.generateRecommendations(analytics, insights),
          ''
        ].join('\n');
        
        if (format === 'text') {
          return report.replace(/[#*]/g, '');
        }
        
        return report;
      }
    }
  },

  // Helper methods
  groupBy(items, key) {
    const grouped = {};
    items.forEach(item => {
      const value = item[key] || 'unknown';
      grouped[value] = (grouped[value] || 0) + 1;
    });
    return grouped;
  },

  calculateCompletionRate(tasks) {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'done').length;
    return Math.round((completed / tasks.length) * 100);
  },

  calculateProductivityScore(tasks) {
    const weights = {
      done: 10,
      in_progress: 5,
      todo: 2,
      blocked: -5
    };
    
    let score = 0;
    tasks.forEach(task => {
      score += weights[task.status] || 0;
      if (task.priority === 'urgent') score += 5;
      if (task.priority === 'high') score += 3;
    });
    
    return Math.max(0, Math.min(100, score));
  },

  calculateGrowthRate(items) {
    if (items.length < 2) return 0;
    
    const sorted = items.sort((a, b) => 
      new Date(a.timestamp || a.created).getTime() - 
      new Date(b.timestamp || b.created).getTime()
    );
    
    const firstDate = new Date(sorted[0].timestamp || sorted[0].created);
    const lastDate = new Date(sorted[sorted.length - 1].timestamp || sorted[sorted.length - 1].created);
    const days = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    
    return Math.round((items.length / days) * 10) / 10; // Items per day
  },

  calculateTrend(items, dateField) {
    const dates = {};
    items.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      dates[date] = (dates[date] || 0) + 1;
    });
    return dates;
  },

  getTopTags(memories) {
    const tags = memories.flatMap(m => m.tags || []);
    const tagCount = {};
    tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
    
    return Object.entries(tagCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  },

  generateRecommendations(analytics, insights) {
    const recommendations = [];
    
    if (analytics.tasks.completion_rate < 50) {
      recommendations.push('- Consider reviewing and closing stale tasks');
    }
    
    if (analytics.tasks.blocked > 0) {
      recommendations.push('- Address blocked tasks to improve workflow');
    }
    
    if (analytics.memories.total < 10) {
      recommendations.push('- Capture more knowledge in memories for better retention');
    }
    
    const complexityDist = analytics.memories.by_complexity;
    if (complexityDist['1'] > complexityDist['3'] + complexityDist['4']) {
      recommendations.push('- Consider adding more detailed, complex memories');
    }
    
    return recommendations.join('\n') || '- System is well-balanced';
  },

  async shutdown() {
    console.error('Analytics tools plugin shutting down');
  }
};