import type { DividendEvent, Fundamentals } from "../models/StockData.js";
import type { AnnualDividendData } from "../models/DividendAnalysis.js";
export declare class DividendCalculator {
    static annualizeDividends(dividendEvents: DividendEvent[]): AnnualDividendData[];
    static calculateTTMDividends(dividendEvents: DividendEvent[]): number;
    static calculateDividendStreak(annualSeries: AnnualDividendData[]): number;
    static calculateSafeGrowth(cagr5: number | null, cagr3: number | null, fundamentals: Fundamentals, streak: number): number;
    static calculateGordonGrowthModel(forwardDividend: number, price: number, requiredReturn: number, safeGrowth: number): number | null;
}
