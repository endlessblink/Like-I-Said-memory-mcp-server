interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  loadTime: number
  scrollFPS: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private observers: ((metrics: PerformanceMetrics) => void)[] = []

  // Measure component render time
  measureRender<T>(name: string, fn: () => T): T {
    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()
    
    console.log(`⚡ ${name} render time: ${(endTime - startTime).toFixed(2)}ms`)
    return result
  }

  // Measure async operations like API calls
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()
    
    console.log(`⚡ ${name} load time: ${(endTime - startTime).toFixed(2)}ms`)
    return result
  }

  // Get current memory usage (if available)
  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      return Math.round(memInfo.usedJSHeapSize / 1024 / 1024) // MB
    }
    return 0
  }

  // Start FPS monitoring for smooth scrolling
  startFPSMonitoring(callback?: (fps: number) => void): () => void {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const countFrames = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) { // Every second
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        frameCount = 0
        lastTime = currentTime
        
        if (callback) callback(fps)
        
        if (fps < 30) {
          console.warn(`⚠️ Low FPS detected: ${fps}fps`)
        }
      }
      
      animationId = requestAnimationFrame(countFrames)
    }

    animationId = requestAnimationFrame(countFrames)

    // Return cleanup function
    return () => cancelAnimationFrame(animationId)
  }

  // Monitor bundle size and load performance
  measureLoadPerformance(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigationTiming) {
        const metrics = {
          domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
          loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
          totalTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart
        }

        console.log('📊 Load Performance:', metrics)
        
        // Log slow loads
        if (metrics.totalTime > 3000) {
          console.warn('⚠️ Slow page load detected:', metrics.totalTime + 'ms')
        }
      }
    })
  }

  // Log performance metrics with context
  log(context: string, additionalData?: Record<string, any>): void {
    const timestamp = new Date().toISOString()
    const memory = this.getMemoryUsage()
    
    console.log(`🔍 Performance Log [${context}] @ ${timestamp}`, {
      memoryUsage: `${memory}MB`,
      ...additionalData
    })
  }

  // Create performance report
  createReport(): string {
    const memory = this.getMemoryUsage()
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    let report = `📊 Performance Report\n`
    report += `================\n`
    report += `Memory Usage: ${memory}MB\n`
    
    if (navigationTiming) {
      const loadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart
      report += `Page Load Time: ${loadTime.toFixed(2)}ms\n`
      report += `DOM Content Loaded: ${(navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart).toFixed(2)}ms\n`
    }
    
    // Resource timings
    const resources = performance.getEntriesByType('resource')
    const slowResources = resources.filter(r => r.duration > 1000)
    
    if (slowResources.length > 0) {
      report += `\n⚠️ Slow Resources (>1s):\n`
      slowResources.forEach(resource => {
        report += `  - ${resource.name.split('/').pop()}: ${resource.duration.toFixed(2)}ms\n`
      })
    }
    
    return report
  }

  // Performance recommendations based on current metrics
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const memory = this.getMemoryUsage()
    
    if (memory > 100) {
      recommendations.push('High memory usage detected. Consider enabling virtualization.')
    }
    
    if (memory > 200) {
      recommendations.push('Very high memory usage. Reduce page size and enable server-side filtering.')
    }
    
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigationTiming) {
      const loadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart
      if (loadTime > 5000) {
        recommendations.push('Slow page load detected. Consider lazy loading and code splitting.')
      }
    }
    
    return recommendations
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return performanceMonitor
}

export default performanceMonitor