import { NetworkError, RateLimitError, DataSourceError } from '../errors/DivvyErrors.js';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  jitterFactor: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error: Error | undefined;
  attempts: number;
  totalDelayMs: number;
}

export class RetryHandler {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['NETWORK_ERROR', 'DATA_SOURCE_YAHOO', 'RATE_LIMIT'],
    jitterFactor: 0.1
  };
  
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const result = await this.executeWithRetry(operation, finalConfig);
    
    if (result.success && result.result !== undefined) {
      return result.result;
    }
    
    throw result.error || new Error('Retry operation failed');
  }
  
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalDelay = 0;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          error: undefined,
          attempts: attempt,
          totalDelayMs: totalDelay
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelayMs: totalDelay
          };
        }
        
        // Don't delay on the last attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          totalDelay += delay;
          
          // Log retry attempt (in production, use proper logger)
          console.warn(`Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms. Error: ${lastError.message}`);
          
          await this.sleep(delay);
        }
      }
    }
    
    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDelayMs: totalDelay
    };
  }
  
  private static isRetryableError(error: Error, retryableErrors: string[]): boolean {
    // Check if error is marked as retryable
    if ('isRetryable' in error && error.isRetryable === true) {
      return true;
    }
    
    // Check error code
    if ('code' in error && typeof error.code === 'string') {
      return retryableErrors.includes(error.code);
    }
    
    // Check error type
    if (error instanceof NetworkError || 
        error instanceof RateLimitError || 
        error instanceof DataSourceError) {
      return error.isRetryable;
    }
    
    // Check common network error patterns
    const networkErrorPatterns = [
      /ENOTFOUND/,
      /ECONNRESET/,
      /ETIMEDOUT/,
      /ECONNREFUSED/,
      /socket hang up/i,
      /network timeout/i,
      /rate limit/i,
      /429/
    ];
    
    return networkErrorPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }
  
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff with jitter
    const baseDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = baseDelay * config.jitterFactor * Math.random();
    const delayWithJitter = baseDelay + jitter;
    
    return Math.min(delayWithJitter, config.maxDelayMs);
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Specific retry configurations for different operations
  static getNetworkRetryConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 10000,
      retryableErrors: ['NETWORK_ERROR', 'RATE_LIMIT']
    };
  }
  
  static getDataSourceRetryConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 2,
      baseDelayMs: 1500,
      maxDelayMs: 5000,
      retryableErrors: ['DATA_SOURCE_YAHOO', 'NETWORK_ERROR']
    };
  }
  
  static getRateLimitRetryConfig(): Partial<RetryConfig> {
    return {
      maxAttempts: 5,
      baseDelayMs: 5000,
      maxDelayMs: 60000,
      backoffMultiplier: 1.5,
      retryableErrors: ['RATE_LIMIT']
    };
  }
  
  // Circuit breaker pattern for failing services
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold = 5,
    recoveryTimeMs = 60000
  ): () => Promise<T> {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;
    
    return async (): Promise<T> => {
      const now = Date.now();
      
      // Check if circuit should be reset
      if (isOpen && now - lastFailureTime > recoveryTimeMs) {
        isOpen = false;
        failures = 0;
      }
      
      // If circuit is open, fail fast
      if (isOpen) {
        throw new DataSourceError(
          'Circuit breaker is open - service temporarily unavailable', 
          'CIRCUIT_BREAKER'
        );
      }
      
      try {
        const result = await operation();
        // Reset failure count on success
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;
        
        // Open circuit if threshold reached
        if (failures >= failureThreshold) {
          isOpen = true;
        }
        
        throw error;
      }
    };
  }
}