export class MemoryManager {
  private static instance: MemoryManager;
  private graphInstances = new WeakSet<any>();
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  // Optimize memory data before processing
  optimizeMemoryData(memories: any[], maxNodes: number = 100): any[] {
    return memories
      .filter(memory => memory && memory.id && (memory.title || memory.content))
      .sort((a, b) => {
        // Prioritize by importance or recency
        const scoreA = this.calculateMemoryScore(a);
        const scoreB = this.calculateMemoryScore(b);
        return scoreB - scoreA;
      })
      .slice(0, maxNodes);
  }
  
  private calculateMemoryScore(memory: any): number {
    let score = 0;
    
    // Recency bonus
    if (memory.timestamp || memory.createdAt) {
      const timestamp = memory.timestamp || memory.createdAt;
      const age = Date.now() - new Date(timestamp).getTime();
      const daysSinceCreation = age / (1000 * 60 * 60 * 24);
      score += Math.max(0, 100 - daysSinceCreation);
    }
    
    // Content richness bonus
    score += (memory.content?.length || 0) * 0.01;
    score += (memory.tags?.length || 0) * 10;
    
    // Category bonus
    if (memory.category) {
      score += 5;
    }
    
    return score;
  }
  
  // Debounce graph updates to prevent excessive re-renders
  debounceGraphUpdate(updateFunction: Function, delay: number = 300): Function {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => updateFunction(...args), delay);
    };
  }
  
  // Monitor memory usage
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1048576; // MB
      const total = memory.totalJSHeapSize / 1048576; // MB
      const percentage = (used / total) * 100;
      
      return {
        used,
        total,
        percentage
      };
    }
    return null;
  }
  
  // Clean up resources
  cleanup(graphInstance?: any): void {
    if (graphInstance) {
      try {
        if (typeof graphInstance.clear === 'function') {
          graphInstance.clear();
        }
        this.graphInstances.delete(graphInstance);
      } catch (error) {
        console.warn('Error during graph cleanup:', error);
      }
    }
    
    // Force garbage collection if available (development only)
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      (window as any).gc();
    }
  }
  
  // Track graph instance
  trackGraphInstance(instance: any): void {
    this.graphInstances.add(instance);
  }
  
  // Check if memory usage is high
  isMemoryUsageHigh(): boolean {
    const usage = this.getMemoryUsage();
    if (usage) {
      return usage.percentage > 80;
    }
    return false;
  }
  
  // Get recommended max nodes based on available memory
  getRecommendedMaxNodes(): number {
    const usage = this.getMemoryUsage();
    if (!usage) return 100; // Default
    
    // Adjust max nodes based on available memory
    if (usage.percentage > 70) return 50;
    if (usage.percentage > 50) return 75;
    if (usage.percentage > 30) return 100;
    return 150;
  }
}

export const memoryManager = MemoryManager.getInstance();