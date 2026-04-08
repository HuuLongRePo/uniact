/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * Start measuring performance
   */
  start(metricName: string): () => void {
    if (!this.enabled) return () => {};

    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.record(metricName, duration);
    };
  }

  /**
   * Record a metric
   */
  private record(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(metricName?: string): any {
    if (metricName) {
      const metrics = this.metrics.get(metricName) || [];
      return this.calculateStats(metrics);
    }

    const summary: any = {};
    this.metrics.forEach((metrics, name) => {
      summary[name] = this.calculateStats(metrics);
    });
    return summary;
  }

  /**
   * Calculate statistics for metrics
   */
  private calculateStats(metrics: PerformanceMetric[]): any {
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0 };
    }

    const durations = metrics.map((m) => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: metrics.length,
      avg: sum / metrics.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total: sum,
    };
  }

  /**
   * Clear metrics
   */
  clear(metricName?: string): void {
    if (metricName) {
      this.metrics.delete(metricName);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Log summary to console
   */
  logSummary(): void {
    if (!this.enabled) return;

    console.warn('[Performance] Metrics Summary:');
    const summary = this.getSummary();

    Object.entries(summary).forEach(([name, stats]: [string, any]) => {
      console.warn(`  ${name}:`, {
        count: stats.count,
        avg: `${stats.avg.toFixed(2)}ms`,
        min: `${stats.min.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Measure async function performance
 */
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const end = perfMonitor.start(name);
  try {
    return await fn();
  } finally {
    end();
  }
}

/**
 * Measure sync function performance
 */
export function measure<T>(name: string, fn: () => T): T {
  const end = perfMonitor.start(name);
  try {
    return fn();
  } finally {
    end();
  }
}
