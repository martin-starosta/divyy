import { Fundamentals } from '../models/StockData.js';
import type { AnnualDividendData } from '../models/DividendAnalysis.js';
import { InsufficientDataError } from '../errors/DivvyErrors.js';

export interface FallbackEstimate {
  value: number;
  confidence: 'low' | 'medium' | 'high';
  source: 'estimated' | 'industry_average' | 'historical' | 'conservative';
  rationale: string;
}

export class FallbackDataProvider {
  
  /**
   * Provides fallback fundamentals when API data is incomplete
   */
  static createFallbackFundamentals(
    partialData: Partial<any>, 
    ttmDividends: number,
    _price: number
  ): Fundamentals {
    const fallbackData: any = { ...partialData };
    
    // Estimate missing financial metrics using conservative assumptions
    if (!fallbackData.OperatingCashFlow && ttmDividends > 0) {
      // Conservative estimate: Assume dividends are 30% of operating cash flow
      fallbackData.OperatingCashFlow = { raw: ttmDividends / 0.3 };
    }
    
    if (!fallbackData.CapitalExpenditure && fallbackData.OperatingCashFlow) {
      // Conservative estimate: CapEx is typically 10-20% of OCF
      fallbackData.CapitalExpenditure = { raw: fallbackData.OperatingCashFlow.raw * 0.15 };
    }
    
    if (!fallbackData.CashDividendsPaid && ttmDividends > 0) {
      fallbackData.CashDividendsPaid = { raw: ttmDividends };
    }
    
    if (!fallbackData.NetIncome && ttmDividends > 0) {
      // Conservative estimate: Assume 40% payout ratio
      fallbackData.NetIncome = { raw: ttmDividends / 0.4 };
    }
    
    if (!fallbackData.payoutRatio && ttmDividends > 0 && fallbackData.NetIncome) {
      fallbackData.payoutRatio = { raw: ttmDividends / fallbackData.NetIncome.raw };
    }
    
    return new Fundamentals(fallbackData);
  }
  
  /**
   * Estimates missing dividend data points using interpolation
   */
  static fillDividendGaps(annualData: AnnualDividendData[]): AnnualDividendData[] {
    if (annualData.length < 2) {
      return annualData;
    }
    
    const sortedData = annualData.sort((a, b) => a[0] - b[0]);
    const filledData: AnnualDividendData[] = [];
    
    for (let i = 0; i < sortedData.length - 1; i++) {
      const [currentYear, currentAmount] = sortedData[i];
      const [nextYear, nextAmount] = sortedData[i + 1];
      
      filledData.push([currentYear, currentAmount]);
      
      // Fill gaps between years
      for (let year = currentYear + 1; year < nextYear; year++) {
        const progress = (year - currentYear) / (nextYear - currentYear);
        const interpolatedAmount = currentAmount + (nextAmount - currentAmount) * progress;
        filledData.push([year, interpolatedAmount]);
      }
    }
    
    // Add the last data point
    filledData.push(sortedData[sortedData.length - 1]);
    
    return filledData;
  }
  
  /**
   * Provides conservative estimates for key ratios when data is missing
   */
  static getConservativeEstimates(): {
    epsPayoutRatio: FallbackEstimate;
    fcfCoverage: FallbackEstimate;
    dividendGrowth: FallbackEstimate;
  } {
    return {
      epsPayoutRatio: {
        value: 0.8, // Conservative 80% payout ratio
        confidence: 'low',
        source: 'conservative',
        rationale: 'Conservative assumption when EPS payout data unavailable'
      },
      fcfCoverage: {
        value: 1.2, // Minimal coverage
        confidence: 'low',
        source: 'conservative',
        rationale: 'Conservative FCF coverage when cash flow data unavailable'
      },
      dividendGrowth: {
        value: 0.0, // No growth assumption
        confidence: 'medium',
        source: 'conservative',
        rationale: 'Zero growth assumption when historical data is insufficient'
      }
    };
  }
  
  /**
   * Creates synthetic dividend history for stocks with limited data
   */
  static createSyntheticDividendHistory(
    knownData: AnnualDividendData[], 
    targetYears: number
  ): AnnualDividendData[] {
    if (knownData.length === 0) {
      throw new InsufficientDataError(['dividend history']);
    }
    
    if (knownData.length >= targetYears) {
      return knownData;
    }
    
    const sortedData = knownData.sort((a, b) => a[0] - b[0]);
    const [oldestYear, oldestAmount] = sortedData[0];
    const [newestYear, newestAmount] = sortedData[sortedData.length - 1];
    
    // Calculate historical growth rate
    const years = newestYear - oldestYear;
    const growthRate = years > 0 ? Math.pow(newestAmount / oldestAmount, 1 / years) - 1 : 0;
    
    // Cap growth rate for conservative estimates
    const conservativeGrowthRate = Math.max(-0.1, Math.min(0.1, growthRate));
    
    const syntheticData: AnnualDividendData[] = [...sortedData];
    
    // Add historical data points going backwards
    let currentAmount = oldestAmount;
    for (let year = oldestYear - 1; year >= newestYear - targetYears; year--) {
      currentAmount = currentAmount / (1 + conservativeGrowthRate);
      if (currentAmount > 0) {
        syntheticData.unshift([year, currentAmount]);
      }
    }
    
    return syntheticData.sort((a, b) => a[0] - b[0]);
  }
  
  /**
   * Provides industry-average estimates for missing data
   */
  static getIndustryAverages(sector?: string): {
    payoutRatio: FallbackEstimate;
    dividendYield: FallbackEstimate;
    fcfMargin: FallbackEstimate;
  } {
    // Default averages (could be enhanced with actual industry data)
    const defaults = {
      payoutRatio: 0.6,
      dividendYield: 0.025,
      fcfMargin: 0.15
    };
    
    // Sector-specific adjustments (simplified for demo)
    const sectorAdjustments: Record<string, Partial<typeof defaults>> = {
      'utilities': { payoutRatio: 0.7, dividendYield: 0.04 },
      'reits': { payoutRatio: 0.9, dividendYield: 0.05 },
      'technology': { payoutRatio: 0.3, dividendYield: 0.015 },
      'financials': { payoutRatio: 0.5, dividendYield: 0.03 }
    };
    
    const adjustments = sector ? sectorAdjustments[sector.toLowerCase()] || {} : {};
    const finalValues = { ...defaults, ...adjustments };
    
    return {
      payoutRatio: {
        value: finalValues.payoutRatio,
        confidence: sector ? 'medium' : 'low',
        source: 'industry_average',
        rationale: sector 
          ? `Industry average for ${sector} sector`
          : 'General market average'
      },
      dividendYield: {
        value: finalValues.dividendYield,
        confidence: sector ? 'medium' : 'low',
        source: 'industry_average',
        rationale: sector 
          ? `Industry average for ${sector} sector`
          : 'General market average'
      },
      fcfMargin: {
        value: finalValues.fcfMargin,
        confidence: 'low',
        source: 'industry_average',
        rationale: 'Estimated free cash flow margin'
      }
    };
  }
  
  /**
   * Validates if we have minimum viable data for analysis
   */
  static validateMinimumData(
    hasPrice: boolean,
    dividendEventCount: number,
    hasAnyFundamentals: boolean
  ): void {
    const missing: string[] = [];
    
    if (!hasPrice) {
      missing.push('current stock price');
    }
    
    if (dividendEventCount === 0) {
      missing.push('dividend history');
    }
    
    if (dividendEventCount < 2) {
      missing.push('sufficient dividend history (minimum 2 years)');
    }
    
    if (missing.length > 0) {
      throw new InsufficientDataError(missing);
    }
    
    // Warning for limited fundamentals
    if (!hasAnyFundamentals) {
      console.warn('Warning: No fundamental data available. Analysis will use conservative estimates.');
    }
  }
  
  /**
   * Creates a data quality report with recommendations
   */
  static assessDataQuality(
    hasPrice: boolean,
    dividendEventCount: number,
    fundamentalFields: number,
    totalFundamentalFields: number
  ): {
    score: number; // 0-100
    level: 'poor' | 'fair' | 'good' | 'excellent';
    recommendations: string[];
  } {
    let score = 0;
    const recommendations: string[] = [];
    
    // Price data (20 points)
    if (hasPrice) {
      score += 20;
    } else {
      recommendations.push('Current price data is required for analysis');
    }
    
    // Dividend history (40 points)
    if (dividendEventCount >= 10) {
      score += 40;
    } else if (dividendEventCount >= 5) {
      score += 30;
      recommendations.push('More dividend history would improve analysis accuracy');
    } else if (dividendEventCount >= 2) {
      score += 20;
      recommendations.push('Limited dividend history - analysis may be less reliable');
    } else {
      recommendations.push('Insufficient dividend history for reliable analysis');
    }
    
    // Fundamental data (40 points)
    const fundamentalCompleteness = fundamentalFields / totalFundamentalFields;
    score += fundamentalCompleteness * 40;
    
    if (fundamentalCompleteness < 0.5) {
      recommendations.push('Missing fundamental data - consider finding additional data sources');
    } else if (fundamentalCompleteness < 0.8) {
      recommendations.push('Some fundamental data missing - analysis uses estimates');
    }
    
    // Determine quality level
    let level: 'poor' | 'fair' | 'good' | 'excellent';
    if (score >= 90) level = 'excellent';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'fair';
    else level = 'poor';
    
    return { score, level, recommendations };
  }
}