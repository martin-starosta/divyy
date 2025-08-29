import type { Quote, Fundamentals } from './StockData.js';
export type AnnualDividendData = [year: number, amount: number];
export interface DividendAnalysisParams {
    ticker: string;
    quote: Quote;
    ttmDividends: number;
    ttmYield: number | null;
    annualDividends: AnnualDividendData[];
    cagr3: number | null;
    cagr5: number | null;
    streak: number;
    fundamentals: Fundamentals;
    safeGrowth: number;
    forwardDividend: number;
    forwardYield: number | null;
    scores: DividendScores;
    totalScore: number;
}
export declare class DividendAnalysis {
    readonly ticker: string;
    readonly quote: Quote;
    readonly ttmDividends: number;
    readonly ttmYield: number | null;
    readonly annualDividends: AnnualDividendData[];
    readonly cagr3: number | null;
    readonly cagr5: number | null;
    readonly streak: number;
    readonly fundamentals: Fundamentals;
    readonly safeGrowth: number;
    readonly forwardDividend: number;
    readonly forwardYield: number | null;
    readonly scores: DividendScores;
    readonly totalScore: number;
    constructor({ ticker, quote, ttmDividends, ttmYield, annualDividends, cagr3, cagr5, streak, fundamentals, safeGrowth, forwardDividend, forwardYield, scores, totalScore }: DividendAnalysisParams);
}
export interface DividendScoresParams {
    payout: number;
    fcf: number;
    streak: number;
    growth: number;
}
export declare class DividendScores {
    readonly payout: number;
    readonly fcf: number;
    readonly streak: number;
    readonly growth: number;
    constructor({ payout, fcf, streak, growth }: DividendScoresParams);
}
