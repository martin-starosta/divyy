import { DividendScores } from "../models/DividendAnalysis.js";
import type { Fundamentals } from "../models/StockData.js";
export declare class ScoreCalculator {
    static calculatePayoutScore(payoutRatio: number): number;
    static calculateFCFCoverageScore(coverage: number): number;
    static calculateStreakScore(streak: number): number;
    static calculateGrowthScore(growthRate: number): number;
    static calculateDividendScores(fundamentals: Fundamentals, streak: number, safeGrowth: number): DividendScores;
    static calculateTotalScore(scores: DividendScores): number;
}
