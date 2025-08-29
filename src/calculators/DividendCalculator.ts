import { sum, clamp } from "../utils/MathUtils.js";
import type { DividendEvent, Fundamentals } from "../models/StockData.js";
import type { AnnualDividendData } from "../models/DividendAnalysis.js";

export class DividendCalculator {
  static annualizeDividends(dividendEvents: DividendEvent[]): AnnualDividendData[] {
    const map = new Map<number, number>();
    
    for (const event of dividendEvents) {
      const year = event.year;
      const amount = event.amount;
      if (!isFinite(amount)) continue;
      map.set(year, (map.get(year) || 0) + amount);
    }
    
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }

  static calculateTTMDividends(dividendEvents: DividendEvent[]): number {
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 3600 * 1000);
    
    return sum(
      dividendEvents
        .filter(d => d.date.getTime() > oneYearAgo)
        .map(d => d.amount)
    );
  }

  static calculateDividendStreak(annualSeries: AnnualDividendData[]): number {
    const sorted = annualSeries.slice().sort((a, b) => a[0] - b[0]);
    let streak = 0;
    
    // Improved calculation with better tolerance for real-world data issues
    for (let i = sorted.length - 1; i > 0; i--) {
      const current = sorted[i][1];
      const previous = sorted[i - 1][1];
      
      // Allow up to 2% decline to handle data rounding, stock splits, and minor cuts
      // This is more realistic for dividend analysis while still being conservative
      if (current >= previous * 0.98) {
        streak++;
      } else {
        // Check if this might be a data quality issue rather than a real cut
        const decline = (previous - current) / previous;
        
        // If decline is small (< 5%) and next year recovers, might be data noise
        if (decline < 0.05 && i < sorted.length - 1) {
          const nextYear = sorted[i + 1][1];
          if (nextYear >= previous * 0.98) {
            // Likely data noise, continue streak but with lower confidence
            streak++;
            continue;
          }
        }
        break;
      }
    }
    
    return streak;
  }

  static calculateSafeGrowth(
    cagr5: number | null, 
    cagr3: number | null, 
    fundamentals: Fundamentals, 
    streak: number
  ): number {
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

  static calculateGordonGrowthModel(
    forwardDividend: number, 
    price: number, 
    requiredReturn: number, 
    safeGrowth: number
  ): number | null {
    if (!price || !isFinite(forwardDividend)) return null;
    
    const conservativeGrowth = Math.max(-0.05, Math.min(0.06, safeGrowth));
    
    if (requiredReturn > conservativeGrowth) {
      return forwardDividend / (requiredReturn - conservativeGrowth);
    }
    
    return null;
  }
}