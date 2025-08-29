import { DividendAnalysis } from "../models/DividendAnalysis.js";
export declare class DividendAnalysisService {
    private readonly yahooService;
    constructor();
    analyze(ticker: string, years?: number, _requiredReturn?: number): Promise<DividendAnalysis>;
}
