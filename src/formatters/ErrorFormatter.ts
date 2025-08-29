import { 
  DivvyError, 
  ValidationError, 
  NetworkError, 
  DataSourceError, 
  TickerNotFoundError,
  InsufficientDataError,
  RateLimitError
} from '../errors/DivvyErrors.js';

export class ErrorFormatter {
  
  static formatError(error: Error): string {
    if (error instanceof TickerNotFoundError) {
      return this.formatTickerNotFoundError(error);
    }
    
    if (error instanceof ValidationError) {
      return this.formatValidationError(error);
    }
    
    if (error instanceof InsufficientDataError) {
      return this.formatInsufficientDataError(error);
    }
    
    if (error instanceof NetworkError) {
      return this.formatNetworkError(error);
    }
    
    if (error instanceof RateLimitError) {
      return this.formatRateLimitError(error);
    }
    
    if (error instanceof DataSourceError) {
      return this.formatDataSourceError(error);
    }
    
    if (error instanceof DivvyError) {
      return this.formatGenericDivvyError(error);
    }
    
    return this.formatGenericError(error);
  }
  
  private static formatTickerNotFoundError(error: TickerNotFoundError): string {
    return [
      `❌ Ticker Symbol Not Found: '${error.ticker}'`,
      '',
      '💡 Suggestions:',
      '   • Check the spelling of the ticker symbol',
      '   • Verify the ticker is listed on a major exchange',
      '   • Try using the full company name to search for the correct ticker',
      '   • Some international stocks may require exchange suffixes (e.g., "BMW.DE")',
      '',
      '📝 Example: divvy AAPL'
    ].join('\n');
  }
  
  private static formatValidationError(error: ValidationError): string {
    return [
      `❌ Invalid Input: ${error.message}`,
      '',
      '💡 Tips:',
      '   • Ticker symbols should be 1-10 characters',
      '   • Use only letters, numbers, dots, and hyphens',
      '   • Years should be between 1-50',
      '   • Required return should be between 0.1%-100%',
      '',
      '📝 Example: divvy MSFT --years 10 --r 0.08'
    ].join('\n');
  }
  
  private static formatInsufficientDataError(error: InsufficientDataError): string {
    return [
      '❌ Insufficient Data for Analysis',
      '',
      `Missing data: ${error.missingData.join(', ')}`,
      '',
      '💡 This could happen because:',
      '   • The company is too new or recently went public',
      '   • The stock has limited trading history',
      '   • The company doesn\'t pay dividends',
      '   • Data provider temporarily unavailable',
      '',
      '🔄 Try again later or check if the ticker symbol is correct.'
    ].join('\n');
  }
  
  private static formatNetworkError(error: NetworkError): string {
    const parts = [
      '❌ Network Connection Issue',
      '',
      `Details: ${error.message}`
    ];
    
    if (error.statusCode) {
      parts.push(`Status Code: ${error.statusCode}`);
    }
    
    parts.push(
      '',
      '💡 Troubleshooting:',
      '   • Check your internet connection',
      '   • Try again in a few moments',
      '   • Verify you can access other websites',
      '   • Check if you\'re behind a corporate firewall',
      ''
    );
    
    if (error.isRetryable) {
      parts.push('🔄 This error is usually temporary. The request will be retried automatically.');
    }
    
    return parts.join('\n');
  }
  
  private static formatRateLimitError(error: RateLimitError): string {
    const parts = [
      '❌ Rate Limit Exceeded',
      '',
      'You\'ve made too many requests in a short time period.',
      ''
    ];
    
    if (error.retryAfter) {
      const minutes = Math.ceil(error.retryAfter / 60000);
      parts.push(`⏳ Please wait ${minutes} minute(s) before trying again.`);
    } else {
      parts.push('⏳ Please wait a few minutes before trying again.');
    }
    
    parts.push(
      '',
      '💡 To avoid rate limits:',
      '   • Reduce the frequency of requests',
      '   • Avoid running multiple divvy commands simultaneously',
      '   • Consider using fewer years of historical data (--years 5)'
    );
    
    return parts.join('\n');
  }
  
  private static formatDataSourceError(error: DataSourceError): string {
    return [
      `❌ Data Source Error (${error.source})`,
      '',
      `Details: ${error.message}`,
      '',
      '💡 This could be due to:',
      '   • Temporary service outage',
      '   • Changes in the data provider\'s API',
      '   • Invalid or delisted ticker symbol',
      '',
      error.isRetryable 
        ? '🔄 This error is usually temporary. Please try again later.'
        : '⚠️  This appears to be a permanent issue. Please verify the ticker symbol.'
    ].join('\n');
  }
  
  private static formatGenericDivvyError(error: DivvyError): string {
    return [
      `❌ Error (${error.code})`,
      '',
      error.message,
      '',
      error.isRetryable 
        ? '🔄 You can try this request again.'
        : '⚠️  Please check your input and try again.'
    ].join('\n');
  }
  
  private static formatGenericError(error: Error): string {
    return [
      '❌ Unexpected Error',
      '',
      error.message,
      '',
      '💡 If this error persists:',
      '   • Try a different ticker symbol',
      '   • Reduce the years of historical data requested',
      '   • Check for any special characters in your command',
      '   • Report this issue if the problem continues',
      '',
      '🐛 Error Details:',
      `   Name: ${error.name}`,
      `   Stack: ${error.stack?.split('\n')[1]?.trim() || 'Not available'}`
    ].join('\n');
  }
  
  static formatWarnings(warnings: string[]): string {
    if (warnings.length === 0) return '';
    
    const parts = [
      '⚠️  Data Quality Warnings:',
      ''
    ];
    
    warnings.forEach(warning => {
      parts.push(`   • ${warning}`);
    });
    
    parts.push(
      '',
      '💡 These warnings indicate potential data quality issues.',
      '   The analysis will continue with estimates where possible.',
      ''
    );
    
    return parts.join('\n');
  }
  
  static formatDataQualityReport(
    score: number, 
    level: string, 
    recommendations: string[]
  ): string {
    const emoji = this.getQualityEmoji(level);
    
    const parts = [
      `${emoji} Data Quality: ${level.toUpperCase()} (${score}/100)`,
      ''
    ];
    
    if (recommendations.length > 0) {
      parts.push('📋 Recommendations:');
      recommendations.forEach(rec => {
        parts.push(`   • ${rec}`);
      });
      parts.push('');
    }
    
    return parts.join('\n');
  }
  
  private static getQualityEmoji(level: string): string {
    switch (level.toLowerCase()) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  }
  
  static formatRetryInfo(attempts: number, totalDelayMs: number): string {
    if (attempts <= 1) return '';
    
    const seconds = (totalDelayMs / 1000).toFixed(1);
    return `🔄 Request completed after ${attempts} attempts (${seconds}s delay)`;
  }
}