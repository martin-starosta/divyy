import { clamp } from "../utils/MathUtils.js";
import { DividendScores, EmaData } from "../models/DividendAnalysis.js";
import type { Fundamentals, Quote } from "../models/StockData.js";

export class ScoreCalculator {
  static calculatePayoutScore(payoutRatio: number): number {
    if (!isFinite(payoutRatio) || payoutRatio <= 0) return 100;
    
    if (payoutRatio <= 0.6) return 100;
    if (payoutRatio >= 1.0) return 0;
    
    return (1 - (payoutRatio - 0.6) / 0.4) * 100;
  }

  static calculateFCFCoverageScore(coverage: number, payoutRatio: number = NaN): number {
    if (!isFinite(coverage)) {
      if (isFinite(payoutRatio) && payoutRatio <= 0.6) {
        return 50;
      }
      return 0;
    }
    if (coverage >= 2) return 100;
    if (coverage <= 0) return 0;
    
    return clamp(coverage / 2, 0, 1) * 100;
  }

  static calculateStreakScore(streak: number): number {
    return clamp(streak / 20, 0, 1) * 100;
  }

  static calculateGrowthScore(growthRate: number): number {
    const x = clamp((growthRate - (-0.10)) / (0.10 - (-0.10)), 0, 1);
    return x * 100;
  }

  static calculateTrendScore(price: number, ema: EmaData): number {
    if (!price || !ema.ema20 || !ema.ema50 || !ema.ema200) {
      return 0;
    }

    let score = 0;
    
    // EMA200 is the most important - if stock is persistently under EMA200, 
    // it indicates market doubts about fundamentals
    if (price > ema.ema200) {
      score += 50; // Increased weight for EMA200
    } else {
      // Stock is under EMA200 - significant negative signal
      score -= 20; // Penalty for being under EMA200
    }
    
    // EMA50 provides medium-term trend context
    if (price > ema.ema50) {
      score += 30;
    }
    
    // EMA20 provides short-term trend context
    if (price > ema.ema20) {
      score += 20;
    }

    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  static calculateDividendScores(
    fundamentals: Fundamentals, 
    streak: number, 
    safeGrowth: number,
    quote: Quote,
    ema: EmaData
  ): DividendScores {
    return new DividendScores({
      payout: this.calculatePayoutScore(fundamentals.epsPayoutRatio),
      fcf: this.calculateFCFCoverageScore(fundamentals.fcfCoverage, fundamentals.epsPayoutRatio),
      streak: this.calculateStreakScore(streak),
      growth: this.calculateGrowthScore(safeGrowth),
      trend: this.calculateTrendScore(quote.price, ema)
    });
  }

  static calculateTotalScore(scores: DividendScores): number {
    return Math.round(
      0.25 * scores.payout +
      0.25 * scores.fcf +
      0.20 * scores.streak +
      0.20 * scores.growth +
      0.10 * scores.trend
    );
  }

  /**
   * Analyzes EMA trends to detect potential fundamental concerns
   */
  static analyzeEMATrends(price: number, ema: EmaData): {
    isUnderEMA200: boolean;
    isUnderEMA50: boolean;
    isUnderEMA20: boolean;
    fundamentalConcerns: string[];
    trendStrength: 'strong_bearish' | 'bearish' | 'neutral' | 'bullish' | 'strong_bullish';
  } {
    const concerns: string[] = [];
    let bearishSignals = 0;
    let bullishSignals = 0;

    if (!price || !ema.ema20 || !ema.ema50 || !ema.ema200) {
      return {
        isUnderEMA200: false,
        isUnderEMA50: false,
        isUnderEMA20: false,
        fundamentalConcerns: ['EMA data unavailable'],
        trendStrength: 'neutral'
      };
    }

    const isUnderEMA200 = price < ema.ema200;
    const isUnderEMA50 = price < ema.ema50;
    const isUnderEMA20 = price < ema.ema20;

    // EMA200 analysis - most critical for fundamentals
    if (isUnderEMA200) {
      concerns.push('Stock trading below EMA200 - market may doubt fundamentals');
      bearishSignals += 2; // Strong bearish signal
    } else {
      bullishSignals += 2; // Strong bullish signal
    }

    // EMA50 analysis
    if (isUnderEMA50) {
      concerns.push('Stock below EMA50 - medium-term trend is bearish');
      bearishSignals += 1;
    } else {
      bullishSignals += 1;
    }

    // EMA20 analysis
    if (isUnderEMA20) {
      concerns.push('Stock below EMA20 - short-term momentum is negative');
      bearishSignals += 1;
    } else {
      bullishSignals += 1;
    }

    // Determine trend strength
    let trendStrength: 'strong_bearish' | 'bearish' | 'neutral' | 'bullish' | 'strong_bullish';
    if (bearishSignals >= 3) trendStrength = 'strong_bearish';
    else if (bearishSignals >= 2) trendStrength = 'bearish';
    else if (bullishSignals >= 3) trendStrength = 'strong_bullish';
    else if (bullishSignals >= 2) trendStrength = 'bullish';
    else trendStrength = 'neutral';

    return {
      isUnderEMA200,
      isUnderEMA50,
      isUnderEMA20,
      fundamentalConcerns: concerns,
      trendStrength
    };
  }
}