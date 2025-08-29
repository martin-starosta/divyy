import yahooFinance from "yahoo-finance2";
import { Quote, DividendEvent, Fundamentals } from "../models/StockData.js";
import { RetryHandler } from "../utils/RetryHandler.js";
import { DataQualityChecker } from "../validation/DataQualityChecker.js";
import { 
  NetworkError, 
  DataSourceError, 
  TickerNotFoundError, 
  RateLimitError 
} from "../errors/DivvyErrors.js";

export class YahooFinanceService {
  
  async getQuote(ticker: string): Promise<Quote> {
    try {
      const quote = await RetryHandler.withRetry(
        async () => {
          const result = await yahooFinance.quote(ticker);
          if (!result) {
            throw new TickerNotFoundError(ticker);
          }
          return result;
        },
        RetryHandler.getNetworkRetryConfig()
      );
      
      return DataQualityChecker.validateQuote(quote);
      
    } catch (error) {
      throw this.handleYahooError(error, 'quote', ticker);
    }
  }

  async getDividendEvents(ticker: string, years: number = 15): Promise<DividendEvent[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - years);
      
      const chart = await RetryHandler.withRetry(
        async () => {
          return await yahooFinance.chart(ticker, {
            period1: startDate,
            period2: endDate,
            interval: "1mo" as const,
            events: "dividends"
          });
        },
        RetryHandler.getDataSourceRetryConfig()
      );

      let divs: any[] = [];
      
      if (chart?.events?.dividends && typeof chart.events.dividends === 'object') {
        divs = Object.values(chart.events.dividends);
      } else if (Array.isArray(chart?.events)) {
        divs = chart.events;
      }
      
      const dividendEvents = (divs || [])
        .map(d => new DividendEvent({
          date: d.date || d.dateUTC || d.timestamp || new Date(),
          amount: d.amount ?? d.divCash ?? d.value ?? 0
        }));
      
      return DataQualityChecker.validateDividendEvents(dividendEvents, ticker);
      
    } catch (error) {
      throw this.handleYahooError(error, 'dividends', ticker);
    }
  }

  async getFundamentals(ticker: string, years: number = 15): Promise<Fundamentals> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - years);
    
    let fundamentals = new Fundamentals();
    let hasData = false;
    
    // Try fundamentals API first
    try {
      const fundamentalsData = await RetryHandler.withRetry(
        async () => {
          return await yahooFinance.fundamentalsTimeSeries(ticker, {
            period1: startDate,
            period2: endDate,
            type: "annual" as const,
            module: "all" as const
          });
        },
        RetryHandler.getDataSourceRetryConfig()
      );
      
      if ((fundamentalsData as any)?.timeSeries?.[0]) {
        fundamentals = new Fundamentals((fundamentalsData as any).timeSeries[0]);
        hasData = true;
      }
    } catch (error) {
      console.warn("Fundamentals API failed, trying quoteSummary fallback...");
    }
    
    // Try quoteSummary as fallback
    if (!hasData) {
      try {
        const quoteSummary = await RetryHandler.withRetry(
          async () => {
            return await yahooFinance.quoteSummary(ticker, {
              modules: ["summaryDetail", "defaultKeyStatistics", "financialData"] as const
            });
          },
          RetryHandler.getDataSourceRetryConfig()
        );
        
        // Extract what data we can from quoteSummary
        const summaryData: any = {};
        const summary = quoteSummary as any;
        
        if (summary?.summaryDetail?.payoutRatio || summary?.defaultKeyStatistics?.payoutRatio) {
          summaryData.payoutRatio = summary.summaryDetail?.payoutRatio ?? 
                                   summary.defaultKeyStatistics?.payoutRatio;
        }
        
        if (Object.keys(summaryData).length > 0) {
          fundamentals = new Fundamentals(summaryData);
          hasData = true;
        }
        
      } catch (error) {
        console.warn("QuoteSummary also failed, using fallback data");
      }
    }
    
    // Validate data quality
    const qualityReport = DataQualityChecker.validateFundamentals(fundamentals);
    
    // Log warnings
    if (qualityReport.warnings.length > 0) {
      console.warn(`Data quality warnings: ${qualityReport.warnings.join(', ')}`);
    }
    
    return fundamentals;
  }
  
  private handleYahooError(error: any, operation: string, ticker: string): Error {
    // Handle specific Yahoo Finance errors
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      return new TickerNotFoundError(ticker);
    }
    
    if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      return new RateLimitError(
        `Yahoo Finance rate limit exceeded for ${operation}`,
        60000 // 1 minute retry delay
      );
    }
    
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return new NetworkError(
        `Network error accessing Yahoo Finance for ${operation}: ${error.message}`
      );
    }
    
    if (error?.message?.includes('timeout')) {
      return new NetworkError(
        `Timeout error accessing Yahoo Finance for ${operation}`
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
      `Yahoo Finance ${operation} failed: ${error.message}`,
      'yahoo',
      true // Most Yahoo errors are retryable
    );
  }
  
  // Health check method to test if Yahoo Finance is accessible
  async healthCheck(): Promise<{ available: boolean; latency: number; error?: string }> {
    const start = Date.now();
    
    try {
      await yahooFinance.quote('AAPL');
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
}