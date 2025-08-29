import type { DividendAnalysis } from '../models/DividendAnalysis.js';
export declare class OutputFormatter {
    static formatPercentage(value: number | null): string;
    static formatNumber(value: number | null, digits?: number): string;
    static formatDividendAnalysis(analysis: DividendAnalysis, _requiredReturn: number): void;
    static formatGordonGrowthModel(ddmPrice: number | null, currentPrice: number, requiredReturn: number, safeGrowth: number): void;
    static formatFooter(): void;
}
