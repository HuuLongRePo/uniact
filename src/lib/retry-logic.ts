/**
 * Retry logic with exponential backoff
 *
 * Giúp xử lý retries một cách thông minh:
 * - Exponential backoff: 100ms → 200ms → 400ms → ...
 * - Max retries: 5 attempts
 * - Circuit breaker: Stop retrying sau N failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = config.initialDelayMs!;

  for (let attempt = 0; attempt <= config.maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxRetries) {
        // Final attempt failed
        break;
      }

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier!, config.maxDelayMs!);

      // Add jitter (±10%)
      const jitter = delay * 0.1 * (Math.random() - 0.5);
      const actualDelay = Math.max(0, delay + jitter);

      console.warn(
        `⏰ Attempt ${attempt + 1}/${config.maxRetries} failed: ${lastError.message}. Retrying in ${actualDelay.toFixed(0)}ms...`
      );

      config.onRetry?.(attempt + 1, lastError);

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Circuit breaker pattern
 * Stop retrying if error pattern detected
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeMs: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.resetTimeMs) {
        this.state = 'half-open';
        console.warn('🔄 Circuit breaker: Trying again (half-open state)');
      } else {
        throw new Error('Circuit breaker is OPEN - too many failures');
      }
    }

    try {
      const result = await fn();

      // Success - reset
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
        console.warn('✅ Circuit breaker: Closed');
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        console.error(`🔴 Circuit breaker: OPEN (${this.failureCount} failures)`);
      }

      throw error;
    }
  }

  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Deprecated: Use retryWithBackoff function directly instead of decorator pattern
// Removed in version 1.1.0 - Decorator pattern no longer needed with modern async/await
