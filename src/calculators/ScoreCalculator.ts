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
    if (price > ema.ema200) {
      score += 40;
    }
    if (price > ema.ema50) {
      score += 30;
    }
    if (price > ema.ema20) {
      score += 30;
    }

    return score;
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
}