import { RetryHandler } from "../utils/RetryHandler.js";
import { 
  NetworkError, 
  DataSourceError, 
  TickerNotFoundError, 
  RateLimitError 
} from "../errors/DivvyErrors.js";

export interface AlphaVantageOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  DividendYield: string;
  DividendDate: string;
  ExDividendDate: string;
  PayoutRatio: string;
}

export interface AlphaVantageTimeSeriesDaily {
  "Meta Data": {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Output Size": string;
    "5. Time Zone": string;
  };
  "Time Series (Daily)": {
    [date: string]: {
      "1. open": string;
      "2. high": string;
      "3. low": string;
      "4. close": string;
      "5. adjusted close": string;
      "6. volume": string;
      "7. dividend amount": string;
      "8. split coefficient": string;
    };
  };
}

export interface AlphaVantageIncomeStatement {
  symbol: string;
  annualReports: Array<{
    fiscalDateEnding: string;
    totalRevenue: string;
    costOfRevenue: string;
    grossProfit: string;
    operatingIncome: string;
    netIncome: string;
  }>;
  quarterlyReports: Array<{
    fiscalDateEnding: string;
    totalRevenue: string;
    netIncome: string;
  }>;
}

export interface AlphaVantageCashFlow {
  symbol: string;
  annualReports: Array<{
    fiscalDateEnding: string;
    operatingCashflow: string;
    capitalExpenditures: string;
    dividendPayout: string;
    freeCashFlow: string;
  }>;
  quarterlyReports: Array<{
    fiscalDateEnding: string;
    operatingCashflow: string;
    capitalExpenditures: string;
  }>;
}

export class AlphaVantageService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly dailyCeiling: number;
  
  constructor(apiKey?: string, dailyCeiling: number = 25) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY || '';
    this.dailyCeiling = dailyCeiling;
    
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key is required. Set ALPHA_VANTAGE_API_KEY environment variable.');
    }
  }

  async getCompanyOverview(symbol: string): Promise<AlphaVantageOverview> {
    try {
      const params = new URLSearchParams({
        function: 'OVERVIEW',
        symbol: symbol.toUpperCase(),
        apikey: this.apiKey
      });

      const response = await RetryHandler.withRetry(
        async () => {
          const res = await fetch(`${this.baseUrl}?${params}`);
          if (!res.ok) {
            throw new NetworkError(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        },
        RetryHandler.getNetworkRetryConfig()
      );

      if (response['Error Message']) {
        throw new TickerNotFoundError(symbol);
      }

      if (response['Note']) {
        throw new RateLimitError(
          'Alpha Vantage API rate limit exceeded',
          60000 // 1 minute retry delay
        );
      }

      if (!response.Symbol) {
        throw new DataSourceError(
          `Invalid response from Alpha Vantage for ${symbol}`,
          'alphavantage',
          false
        );
      }

      return response as AlphaVantageOverview;
      
    } catch (error) {
      throw this.handleAlphaVantageError(error, 'overview', symbol);
    }
  }

  async getTimeSeriesDaily(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<AlphaVantageTimeSeriesDaily> {
    try {
      const params = new URLSearchParams({
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol: symbol.toUpperCase(),
        outputsize: outputSize,
        apikey: this.apiKey
      });

      const response = await RetryHandler.withRetry(
        async () => {
          const res = await fetch(`${this.baseUrl}?${params}`);
          if (!res.ok) {
            throw new NetworkError(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        },
        RetryHandler.getNetworkRetryConfig()
      );

      if (response['Error Message']) {
        throw new TickerNotFoundError(symbol);
      }

      if (response['Note']) {
        throw new RateLimitError(
          'Alpha Vantage API rate limit exceeded',
          60000
        );
      }

      if (!response['Time Series (Daily)']) {
        throw new DataSourceError(
          `No time series data available for ${symbol}`,
          'alphavantage',
          false
        );
      }

      return response as AlphaVantageTimeSeriesDaily;
      
    } catch (error) {
      throw this.handleAlphaVantageError(error, 'time-series', symbol);
    }
  }

  async getIncomeStatement(symbol: string): Promise<AlphaVantageIncomeStatement> {
    try {
      const params = new URLSearchParams({
        function: 'INCOME_STATEMENT',
        symbol: symbol.toUpperCase(),
        apikey: this.apiKey
      });

      const response = await RetryHandler.withRetry(
        async () => {
          const res = await fetch(`${this.baseUrl}?${params}`);
          if (!res.ok) {
            throw new NetworkError(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        },
        RetryHandler.getNetworkRetryConfig()
      );

      if (response['Error Message']) {
        throw new TickerNotFoundError(symbol);
      }

      if (response['Note']) {
        throw new RateLimitError(
          'Alpha Vantage API rate limit exceeded',
          60000
        );
      }

      if (!response.annualReports) {
        throw new DataSourceError(
          `No income statement data available for ${symbol}`,
          'alphavantage',
          false
        );
      }

      return response as AlphaVantageIncomeStatement;
      
    } catch (error) {
      throw this.handleAlphaVantageError(error, 'income-statement', symbol);
    }
  }

  async getCashFlow(symbol: string): Promise<AlphaVantageCashFlow> {
    try {
      const params = new URLSearchParams({
        function: 'CASH_FLOW',
        symbol: symbol.toUpperCase(),
        apikey: this.apiKey
      });

      const response = await RetryHandler.withRetry(
        async () => {
          const res = await fetch(`${this.baseUrl}?${params}`);
          if (!res.ok) {
            throw new NetworkError(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        },
        RetryHandler.getNetworkRetryConfig()
      );

      if (response['Error Message']) {
        throw new TickerNotFoundError(symbol);
      }

      if (response['Note']) {
        throw new RateLimitError(
          'Alpha Vantage API rate limit exceeded',
          60000
        );
      }

      if (!response.annualReports) {
        throw new DataSourceError(
          `No cash flow data available for ${symbol}`,
          'alphavantage',
          false
        );
      }

      return response as AlphaVantageCashFlow;
      
    } catch (error) {
      throw this.handleAlphaVantageError(error, 'cash-flow', symbol);
    }
  }

  private handleAlphaVantageError(error: any, operation: string, symbol: string): Error {
    // Handle specific Alpha Vantage errors
    if (error?.message?.includes('Invalid API call') || error?.message?.includes('not found')) {
      return new TickerNotFoundError(symbol);
    }
    
    if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
      return new RateLimitError(
        `Alpha Vantage rate limit exceeded for ${operation}`,
        60000
      );
    }
    
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return new NetworkError(
        `Network error accessing Alpha Vantage for ${operation}: ${error.message}`
      );
    }
    
    if (error?.message?.includes('timeout')) {
      return new NetworkError(
        `Timeout error accessing Alpha Vantage for ${operation}`
      );
    }
    
    // If it's already one of our custom errors, pass it through
    if (error?.code?.startsWith('VALIDATION_') || 
        error?.code?.startsWith('DATA_QUALITY_') ||
        error?.code?.startsWith('INSUFFICIENT_')) {
      return error;
    }
    
    // Generic data source error
    return new DataSourceError(
      `Alpha Vantage ${operation} failed: ${error.message}`,
      'alphavantage',
      true
    );
  }

  // Health check method to test if Alpha Vantage is accessible
  async healthCheck(): Promise<{ available: boolean; latency: number; error?: string }> {
    const start = Date.now();
    
    try {
      await this.getCompanyOverview('AAPL');
      return {
        available: true,
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get remaining daily quota (placeholder - would need actual implementation)
  getRemainingQuota(): number {
    // This would integrate with rate limiting service in Phase 4
    return this.dailyCeiling;
  }
}