import { clamp } from "../utils/MathUtils.js";
import { DividendScores } from "../models/DividendAnalysis.js";

export class ScoreCalculator {
  static calculatePayoutScore(payoutRatio) {
    if (!isFinite(payoutRatio) || payoutRatio <= 0) return 100;
    
    if (payoutRatio <= 0.6) return 100;
    if (payoutRatio >= 1.0) return 0;
    
    return (1 - (payoutRatio - 0.6) / 0.4) * 100;
  }

  static calculateFCFCoverageScore(coverage) {
    if (!isFinite(coverage)) return 0;
    if (coverage >= 2) return 100;
    if (coverage <= 0) return 0;
    
    return clamp(coverage / 2, 0, 1) * 100;
  }

  static calculateStreakScore(streak) {
    return clamp(streak / 20, 0, 1) * 100;
  }

  static calculateGrowthScore(growthRate) {
    const x = clamp((growthRate - (-0.10)) / (0.10 - (-0.10)), 0, 1);
    return x * 100;
  }

  static calculateDividendScores(fundamentals, streak, safeGrowth) {
    return new DividendScores({
      payout: this.calculatePayoutScore(fundamentals.epsPayoutRatio),
      fcf: this.calculateFCFCoverageScore(fundamentals.fcfCoverage),
      streak: this.calculateStreakScore(streak),
      growth: this.calculateGrowthScore(safeGrowth)
    });
  }

  static calculateTotalScore(scores) {
    return Math.round(
      0.30 * scores.payout +
      0.30 * scores.fcf +
      0.20 * scores.streak +
      0.20 * scores.growth
    );
  }
}