import { DividendAnalysis } from "../models/DividendAnalysis.js";
export declare class DividendAnalysisService {
    private readonly yahooService;
    constructor();
    healthCheck(): Promise<{
        available: boolean;
        latency: number;
        error?: string;
    }>;
    analyze(ticker: string, years?: number, _requiredReturn?: number): Promise<DividendAnalysis>;
}
