import { clamp } from "../utils/MathUtils";
import { DividendScores, EmaData } from "../models/DividendAnalysis";
import type { Fundamentals, Quote } from "../models/StockData";
import { MacdData, RsiData } from "./TechnicalIndicatorCalculator";

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

  static calculateMACDScore(macd: MacdData): number {
    // If no MACD data available, return neutral score
    if (!macd || macd.macdLine === null || macd.signalLine === null || macd.histogram === null) {
      return 50; // Neutral score when data unavailable
    }

    let score = 50; // Start with neutral score

    // MACD Line vs Signal Line (primary signal)
    if (macd.macdLine > macd.signalLine) {
      // Bullish signal
      const diff = macd.macdLine - macd.signalLine;
      score += Math.min(30, diff * 15); // Up to 30 points for strong bullish signal
    } else {
      // Bearish signal
      const diff = macd.signalLine - macd.macdLine;
      score -= Math.min(30, diff * 15); // Down to 30 points for strong bearish signal
    }

    // Histogram analysis (momentum)
    if (macd.histogram > 0) {
      // Positive momentum
      score += Math.min(20, macd.histogram * 10); // Up to 20 points for strong positive momentum
    } else {
      // Negative momentum
      score -= Math.min(20, Math.abs(macd.histogram) * 10); // Down to 20 points for strong negative momentum
    }

    // MACD line position relative to zero (trend strength)
    if (macd.macdLine > 0) {
      // Above zero line - bullish trend
      score += Math.min(10, macd.macdLine * 5);
    } else {
      // Below zero line - bearish trend  
      score -= Math.min(10, Math.abs(macd.macdLine) * 5);
    }

    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  static calculateRSIScore(rsi: RsiData): number {
    // If no RSI data available, return neutral score
    if (!rsi || rsi.rsi === null) {
      return 50; // Neutral score when data unavailable
    }

    const rsiValue = rsi.rsi;
    let score = 50; // Start with neutral score

    // RSI-based scoring logic for dividend stocks
    // For dividend stocks, we prefer stocks that aren't severely overbought or oversold
    
    if (rsiValue >= 20 && rsiValue <= 80) {
      // Normal range - good for dividend stocks
      if (rsiValue >= 40 && rsiValue <= 60) {
        // Sweet spot for dividend investing - not extreme
        score = 100;
      } else if (rsiValue >= 30 && rsiValue <= 70) {
        // Good range
        score = 85;
      } else {
        // Still acceptable but getting toward extremes
        score = 70;
      }
    } else if (rsiValue > 80) {
      // Overbought - potentially risky entry point for dividend investors
      if (rsiValue > 90) {
        score = 10; // Extremely overbought
      } else {
        score = 30; // Very overbought
      }
    } else if (rsiValue < 20) {
      // Oversold - could be opportunity but also risk
      if (rsiValue < 10) {
        score = 20; // Extremely oversold - high risk/reward
      } else {
        score = 40; // Oversold - potential opportunity
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  static calculateDividendScores(
    fundamentals: Fundamentals, 
    streak: number, 
    safeGrowth: number,
    quote: Quote,
    ema: EmaData,
    macd: MacdData,
    rsi: RsiData
  ): DividendScores {
    return new DividendScores({
      payout: this.calculatePayoutScore(fundamentals.epsPayoutRatio),
      fcf: this.calculateFCFCoverageScore(fundamentals.fcfCoverage, fundamentals.epsPayoutRatio),
      streak: this.calculateStreakScore(streak),
      growth: this.calculateGrowthScore(safeGrowth),
      trend: this.calculateTrendScore(quote.price, ema),
      macd: this.calculateMACDScore(macd),
      rsi: this.calculateRSIScore(rsi)
    });
  }

  static calculateTotalScore(scores: DividendScores): number {
    return Math.round(
      0.25 * scores.payout +
      0.25 * scores.fcf +
      0.17 * scores.streak +
      0.16 * scores.growth +
      0.07 * scores.trend +
      0.06 * scores.macd +
      0.04 * scores.rsi
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