export abstract class DivvyError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;
  
  constructor(message: string, code: string, isRetryable = false) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isRetryable = isRetryable;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DivvyError {
  constructor(message: string, field?: string) {
    const code = field ? `VALIDATION_${field.toUpperCase()}` : 'VALIDATION_ERROR';
    super(message, code, false);
  }
}

export class DataSourceError extends DivvyError {
  public readonly source: string;
  
  constructor(message: string, source: string, isRetryable = true) {
    super(message, `DATA_SOURCE_${source.toUpperCase()}`, isRetryable);
    this.source = source;
  }
}

export class NetworkError extends DivvyError {
  public readonly statusCode: number | undefined;
  
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', true);
    this.statusCode = statusCode;
  }
}

export class DataQualityError extends DivvyError {
  public readonly dataType: string;
  
  constructor(message: string, dataType: string) {
    super(message, `DATA_QUALITY_${dataType.toUpperCase()}`, false);
    this.dataType = dataType;
  }
}

export class ConfigurationError extends DivvyError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', false);
  }
}

export class TickerNotFoundError extends DivvyError {
  public readonly ticker: string;
  
  constructor(ticker: string) {
    super(`Ticker symbol '${ticker}' not found or invalid`, 'TICKER_NOT_FOUND', false);
    this.ticker = ticker;
  }
}

export class InsufficientDataError extends DivvyError {
  public readonly missingData: string[];
  
  constructor(missingData: string[]) {
    const dataList = missingData.join(', ');
    super(`Insufficient data for analysis. Missing: ${dataList}`, 'INSUFFICIENT_DATA', false);
    this.missingData = missingData;
  }
}

export class RateLimitError extends DivvyError {
  public readonly retryAfter: number | undefined;
  
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', true);
    this.retryAfter = retryAfter;
  }
}