import { sum, calculateCAGR, clamp } from "../utils/MathUtils.js";

export class DividendCalculator {
  static annualizeDividends(dividendEvents) {
    const map = new Map();
    
    for (const event of dividendEvents) {
      const year = event.year;
      const amount = event.amount;
      if (!isFinite(amount)) continue;
      map.set(year, (map.get(year) || 0) + amount);
    }
    
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }

  static calculateTTMDividends(dividendEvents) {
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 3600 * 1000);
    
    return sum(
      dividendEvents
        .filter(d => d.date.getTime() > oneYearAgo)
        .map(d => d.amount)
    );
  }

  static calculateDividendStreak(annualSeries) {
    const sorted = annualSeries.slice().sort((a, b) => a[0] - b[0]);
    let streak = 0;
    
    for (let i = sorted.length - 1; i > 0; i--) {
      const current = sorted[i][1];
      const previous = sorted[i - 1][1];
      
      if (current >= previous * 0.999) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  static calculateSafeGrowth(cagr5, cagr3, fundamentals, streak) {
    const growthBase = cagr5 ?? cagr3 ?? 0;
    let safeGrowth = clamp(growthBase, -0.10, 0.15);
    
    const epsPayoutRatio = fundamentals.epsPayoutRatio;
    const fcfPayoutRatio = fundamentals.fcfPayoutRatio;
    
    if ((isFinite(epsPayoutRatio) && epsPayoutRatio > 0.8) ||
        (isFinite(fcfPayoutRatio) && fcfPayoutRatio > 1.0) ||
        streak < 3) {
      safeGrowth = Math.min(safeGrowth, 0);
    }
    
    return safeGrowth;
  }

  static calculateGordonGrowthModel(forwardDividend, price, requiredReturn, safeGrowth) {
    if (!price || !isFinite(forwardDividend)) return null;
    
    const conservativeGrowth = Math.max(-0.05, Math.min(0.06, safeGrowth));
    
    if (requiredReturn > conservativeGrowth) {
      return forwardDividend / (requiredReturn - conservativeGrowth);
    }
    
    return null;
  }
}