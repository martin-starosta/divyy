import { Quote, DividendEvent, Fundamentals } from "../models/StockData.js";
export declare class YahooFinanceService {
    getQuote(ticker: string): Promise<Quote>;
    getDividendEvents(ticker: string, years?: number): Promise<DividendEvent[]>;
    getFundamentals(ticker: string, years?: number): Promise<Fundamentals>;
    private handleYahooError;
    healthCheck(): Promise<{
        available: boolean;
        latency: number;
        error?: string;
    }>;
}
