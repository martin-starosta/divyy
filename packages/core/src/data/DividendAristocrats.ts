/**
 * Known dividend aristocrats and kings for data quality validation
 * Sources: S&P Dividend Aristocrats list, Dividend Kings lists
 */

export interface DividendEliteStock {
  ticker: string;
  name: string;
  yearsOfIncreases: number;
  category: 'king' | 'aristocrat';
  notes?: string;
}

export const DIVIDEND_KINGS: DividendEliteStock[] = [
  { ticker: 'KO', name: 'Coca-Cola', yearsOfIncreases: 61, category: 'king' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', yearsOfIncreases: 61, category: 'king' },
  { ticker: 'PG', name: 'Procter & Gamble', yearsOfIncreases: 67, category: 'king' },
  { ticker: 'MMM', name: '3M Company', yearsOfIncreases: 65, category: 'king' },
  { ticker: 'CL', name: 'Colgate-Palmolive', yearsOfIncreases: 60, category: 'king' },
  { ticker: 'KMB', name: 'Kimberly-Clark', yearsOfIncreases: 51, category: 'king' },
  { ticker: 'SYY', name: 'Sysco Corporation', yearsOfIncreases: 53, category: 'king' },
  { ticker: 'HRL', name: 'Hormel Foods', yearsOfIncreases: 57, category: 'king' },
  { ticker: 'WMT', name: 'Walmart', yearsOfIncreases: 49, category: 'king' },
  { ticker: 'PEP', name: 'PepsiCo', yearsOfIncreases: 51, category: 'king' },
  { ticker: 'MDT', name: 'Medtronic', yearsOfIncreases: 46, category: 'king' },
  { ticker: 'CVX', name: 'Chevron', yearsOfIncreases: 36, category: 'king' },
  { ticker: 'XOM', name: 'Exxon Mobil', yearsOfIncreases: 40, category: 'king' },
  { ticker: 'ED', name: 'Consolidated Edison', yearsOfIncreases: 49, category: 'king' },
  { ticker: 'SO', name: 'Southern Company', yearsOfIncreases: 42, category: 'king' },
];

export const DIVIDEND_ARISTOCRATS: DividendEliteStock[] = [
  { ticker: 'ABBV', name: 'AbbVie', yearsOfIncreases: 51, category: 'aristocrat' },
  { ticker: 'ADM', name: 'Archer-Daniels-Midland', yearsOfIncreases: 48, category: 'aristocrat' },
  { ticker: 'AFL', name: 'Aflac', yearsOfIncreases: 40, category: 'aristocrat' },
  { ticker: 'ALB', name: 'Albemarle Corporation', yearsOfIncreases: 29, category: 'aristocrat' },
  { ticker: 'APD', name: 'Air Products and Chemicals', yearsOfIncreases: 41, category: 'aristocrat' },
  { ticker: 'ATO', name: 'Atmos Energy', yearsOfIncreases: 39, category: 'aristocrat' },
  { ticker: 'BDX', name: 'Becton Dickinson', yearsOfIncreases: 51, category: 'aristocrat' },
  { ticker: 'BF.B', name: 'Brown-Forman', yearsOfIncreases: 39, category: 'aristocrat' },
  { ticker: 'CAT', name: 'Caterpillar', yearsOfIncreases: 29, category: 'aristocrat' },
  { ticker: 'CHD', name: 'Church & Dwight', yearsOfIncreases: 27, category: 'aristocrat' },
  { ticker: 'CTAS', name: 'Cintas Corporation', yearsOfIncreases: 39, category: 'aristocrat' },
  { ticker: 'ECL', name: 'Ecolab', yearsOfIncreases: 31, category: 'aristocrat' },
  { ticker: 'EMR', name: 'Emerson Electric', yearsOfIncreases: 66, category: 'aristocrat' },
  { ticker: 'ESS', name: 'Essex Property Trust', yearsOfIncreases: 29, category: 'aristocrat' },
  { ticker: 'EXPD', name: 'Expeditors International', yearsOfIncreases: 28, category: 'aristocrat' },
  { ticker: 'GPC', name: 'Genuine Parts', yearsOfIncreases: 67, category: 'aristocrat' },
  { ticker: 'ITW', name: 'Illinois Tool Works', yearsOfIncreases: 60, category: 'aristocrat' },
  { ticker: 'LOW', name: 'Lowe\'s Companies', yearsOfIncreases: 60, category: 'aristocrat' },
  { ticker: 'MCD', name: 'McDonald\'s Corporation', yearsOfIncreases: 46, category: 'aristocrat' },
  { ticker: 'MKC', name: 'McCormick & Company', yearsOfIncreases: 37, category: 'aristocrat' },
  { ticker: 'NDSN', name: 'Nordson Corporation', yearsOfIncreases: 60, category: 'aristocrat' },
  { ticker: 'NUE', name: 'Nucor Corporation', yearsOfIncreases: 50, category: 'aristocrat' },
  { ticker: 'O', name: 'Realty Income', yearsOfIncreases: 28, category: 'aristocrat' },
  { ticker: 'PNR', name: 'Pentair plc', yearsOfIncreases: 47, category: 'aristocrat' },
  { ticker: 'PPG', name: 'PPG Industries', yearsOfIncreases: 51, category: 'aristocrat' },
  { ticker: 'SHW', name: 'Sherwin-Williams', yearsOfIncreases: 44, category: 'aristocrat' },
  { ticker: 'SPGI', name: 'S&P Global', yearsOfIncreases: 50, category: 'aristocrat' },
  { ticker: 'SWK', name: 'Stanley Black & Decker', yearsOfIncreases: 55, category: 'aristocrat' },
  { ticker: 'TGT', name: 'Target Corporation', yearsOfIncreases: 55, category: 'aristocrat' },
  { ticker: 'TROW', name: 'T. Rowe Price', yearsOfIncreases: 37, category: 'aristocrat' },
  { ticker: 'WBA', name: 'Walgreens Boots Alliance', yearsOfIncreases: 47, category: 'aristocrat' },
  { ticker: 'WST', name: 'West Pharmaceutical Services', yearsOfIncreases: 30, category: 'aristocrat' },
];

export class DividendEliteDetector {
  private static readonly ALL_ELITE = [...DIVIDEND_KINGS, ...DIVIDEND_ARISTOCRATS];
  
  /**
   * Check if a ticker is a known dividend elite stock
   */
  static isKnownElite(ticker: string): DividendEliteStock | null {
    return this.ALL_ELITE.find(stock => stock.ticker === ticker) || null;
  }
  
  /**
   * Get expected dividend streak for known elite stocks
   */
  static getExpectedStreak(ticker: string): number | null {
    const stock = this.isKnownElite(ticker);
    return stock ? stock.yearsOfIncreases : null;
  }
  
  /**
   * Validate calculated streak against known data
   */
  static validateStreak(ticker: string, calculatedStreak: number): {
    isValid: boolean;
    expectedStreak?: number;
    confidence: 'high' | 'medium' | 'low';
    warning?: string;
  } {
    const expectedStreak = this.getExpectedStreak(ticker);
    
    if (!expectedStreak) {
      // Not a known elite stock
      return {
        isValid: true,
        confidence: 'high'
      };
    }
    
    // For known elite stocks, check if calculated streak is reasonable
    const ratio = calculatedStreak / expectedStreak;
    
    if (ratio >= 0.8) {
      // Within 20% of expected - likely good data
      return {
        isValid: true,
        expectedStreak,
        confidence: 'high'
      };
    } else if (ratio >= 0.5) {
      // 50-80% of expected - some data issues
      return {
        isValid: true,
        expectedStreak,
        confidence: 'medium',
        warning: `Calculated streak (${calculatedStreak}) lower than expected (${expectedStreak}) due to data quality issues`
      };
    } else if (calculatedStreak >= 10) {
      // At least 10 years but much lower than expected
      return {
        isValid: true,
        expectedStreak,
        confidence: 'low',
        warning: `Significant data quality issues detected. Expected ${expectedStreak} years, calculated ${calculatedStreak}`
      };
    } else {
      // Very low streak for known elite stock - major data problems
      return {
        isValid: false,
        expectedStreak,
        confidence: 'low',
        warning: `Major data quality issues. Known ${this.isKnownElite(ticker)?.category} with ${expectedStreak} years, but calculated only ${calculatedStreak}`
      };
    }
  }
  
  /**
   * Get all tickers by category
   */
  static getKings(): string[] {
    return DIVIDEND_KINGS.map(stock => stock.ticker);
  }
  
  static getAristocrats(): string[] {
    return DIVIDEND_ARISTOCRATS.map(stock => stock.ticker);
  }
  
  /**
   * Suggest adjusted streak based on known status
   */
  static getAdjustedStreak(ticker: string, calculatedStreak: number): {
    adjustedStreak: number;
    adjustment: 'none' | 'minor' | 'major';
    rationale: string | undefined;
  } {
    const validation = this.validateStreak(ticker, calculatedStreak);
    
    if (!validation.expectedStreak || validation.confidence === 'high') {
      return {
        adjustedStreak: calculatedStreak,
        adjustment: 'none',
        rationale: undefined
      };
    }
    
    if (validation.confidence === 'medium') {
      // Minor adjustment - use calculated but note the issue
      return {
        adjustedStreak: calculatedStreak,
        adjustment: 'minor',
        rationale: validation.warning
      };
    }
    
    // Major adjustment - use a conservative estimate
    const conservativeEstimate = Math.max(calculatedStreak, Math.min(validation.expectedStreak * 0.7, 25));
    
    return {
      adjustedStreak: Math.round(conservativeEstimate),
      adjustment: 'major',
      rationale: `Adjusted for known ${this.isKnownElite(ticker)?.category} status with data quality issues`
    };
  }
}