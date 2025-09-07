import { DataQualityError, InsufficientDataError, TickerNotFoundError } from '../errors/DivvyErrors.js';
import { Quote, DividendEvent, Fundamentals } from '../models/StockData.js';
import type { AnnualDividendData } from '../models/DividendAnalysis.js';

export interface DataQualityReport {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  missingData: string[];
  dataCompleteness: number; // 0-100%
}

export class DataQualityChecker {
  
  static validateQuote(quote: any): Quote {
    if (!quote) {
      throw new TickerNotFoundError('UNKNOWN');
    }
    
    const warnings: string[] = [];
    
    // Check required fields
    if (!quote.regularMarketPrice && !quote.postMarketPrice && !quote.preMarketPrice) {
      throw new DataQualityError('No valid price data found', 'quote');
    }
    
    const price = quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice;
    if (price <= 0) {
      throw new DataQualityError('Invalid price: must be greater than zero', 'quote');
    }
    
    if (price > 100000) {
      warnings.push('Unusually high stock price detected');
    }
    
    // Check for company name
    if (!quote.shortName && !quote.longName) {
      warnings.push('Company name not available');
    }
    
    // Validate currency
    if (!quote.currency) {
      warnings.push('Currency information missing, assuming USD');
    }
    
    return new Quote(quote);
  }
  
  static validateDividendEvents(events: DividendEvent[], _ticker: string): DividendEvent[] {
    if (!Array.isArray(events)) {
      throw new DataQualityError('Invalid dividend events data structure', 'dividends');
    }
    
    if (events.length === 0) {
      throw new InsufficientDataError(['dividend history']);
    }
    
    const validEvents = events.filter(event => {
      try {
        return event.isValid();
      } catch {
        return false;
      }
    });
    
    if (validEvents.length === 0) {
      throw new DataQualityError('No valid dividend events found', 'dividends');
    }
    
    // Check for data quality issues
    const warnings: string[] = [];
    
    if (validEvents.length < events.length) {
      warnings.push(`Filtered out ${events.length - validEvents.length} invalid dividend events`);
    }
    
    // Check for suspicious dividend amounts
    const amounts = validEvents.map(e => e.amount);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    if (maxAmount / minAmount > 100) {
      warnings.push('Large variation in dividend amounts detected');
    }
    
    // Check for temporal consistency
    const sortedEvents = validEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    let previousYear = 0;
    
    for (const event of sortedEvents) {
      const year = event.year;
      if (year < previousYear) {
        warnings.push('Dividend events may not be properly sorted');
        break;
      }
      previousYear = year;
    }
    
    // Minimum data requirement
    if (validEvents.length < 4) {
      throw new InsufficientDataError(['sufficient dividend history (minimum 4 events)']);
    }
    
    return validEvents;
  }
  
  static validateFundamentals(fundamentals: Fundamentals): DataQualityReport {
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingData: string[] = [];
    
    // Check operating cash flow
    if (!isFinite(fundamentals.operatingCashFlow)) {
      missingData.push('operating cash flow');
    } else if (fundamentals.operatingCashFlow < -1e12) {
      warnings.push('Unusually large negative operating cash flow');
    }
    
    // Check capital expenditure
    if (!isFinite(fundamentals.capitalExpenditure)) {
      missingData.push('capital expenditure');
    } else if (fundamentals.capitalExpenditure > 1e12) {
      warnings.push('Unusually large capital expenditure');
    }
    
    // Check dividend payments
    if (!isFinite(fundamentals.cashDividendsPaid)) {
      missingData.push('cash dividends paid');
    } else if (fundamentals.cashDividendsPaid < 0) {
      warnings.push('Negative dividend payments detected');
    }
    
    // Check net income
    if (!isFinite(fundamentals.netIncome)) {
      missingData.push('net income');
    }
    
    // Check payout ratio
    if (!isFinite(fundamentals.epsPayoutRatio)) {
      missingData.push('EPS payout ratio');
    } else if (fundamentals.epsPayoutRatio > 2) {
      warnings.push('Very high EPS payout ratio (>200%)');
    } else if (fundamentals.epsPayoutRatio < 0) {
      warnings.push('Negative EPS payout ratio');
    }
    
    // Calculate data completeness
    const totalFields = 5; // OCF, CapEx, Dividends, Net Income, Payout Ratio
    const availableFields = totalFields - missingData.length;
    const dataCompleteness = (availableFields / totalFields) * 100;
    
    const isValid = errors.length === 0 && missingData.length < totalFields;
    
    return {
      isValid,
      warnings,
      errors,
      missingData,
      dataCompleteness
    };
  }
  
  static validateAnnualDividends(annualData: AnnualDividendData[]): DataQualityReport {
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingData: string[] = [];
    
    if (!Array.isArray(annualData) || annualData.length === 0) {
      errors.push('No annual dividend data available');
      return {
        isValid: false,
        warnings,
        errors,
        missingData: ['annual dividend history'],
        dataCompleteness: 0
      };
    }
    
    // Check for minimum data points
    if (annualData.length < 3) {
      warnings.push('Limited dividend history (less than 3 years)');
    }
    
    // Check for data consistency
    let previousYear = 0;
    for (const [year, amount] of annualData) {
      if (year <= previousYear) {
        warnings.push('Duplicate or out-of-order years in dividend data');
        break;
      }
      
      if (amount < 0) {
        warnings.push(`Negative dividend amount found for year ${year}`);
      }
      
      if (amount > 1000) {
        warnings.push(`Unusually high dividend amount for year ${year}`);
      }
      
      previousYear = year;
    }
    
    // Check for gaps in years
    const years = annualData.map(([year]) => year).sort((a, b) => a - b);
    for (let i = 1; i < years.length; i++) {
      if (years[i] - years[i-1] > 1) {
        warnings.push(`Gap in dividend data between ${years[i-1]} and ${years[i]}`);
      }
    }
    
    const dataCompleteness = Math.min(100, (annualData.length / 10) * 100); // 10 years = 100%
    
    return {
      isValid: true,
      warnings,
      errors,
      missingData,
      dataCompleteness
    };
  }
  
  static generateOverallReport(reports: DataQualityReport[]): DataQualityReport {
    const combinedWarnings: string[] = [];
    const combinedErrors: string[] = [];
    const combinedMissingData: string[] = [];
    
    let totalCompleteness = 0;
    let validReports = 0;
    
    for (const report of reports) {
      combinedWarnings.push(...report.warnings);
      combinedErrors.push(...report.errors);
      combinedMissingData.push(...report.missingData);
      
      if (report.isValid) {
        totalCompleteness += report.dataCompleteness;
        validReports++;
      }
    }
    
    const overallCompleteness = validReports > 0 ? totalCompleteness / validReports : 0;
    const isValid = combinedErrors.length === 0 && validReports === reports.length;
    
    return {
      isValid,
      warnings: [...new Set(combinedWarnings)], // Remove duplicates
      errors: [...new Set(combinedErrors)],
      missingData: [...new Set(combinedMissingData)],
      dataCompleteness: overallCompleteness
    };
  }
}