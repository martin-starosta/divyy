import type { YahooQuoteResponse, YahooFundamentalsData } from '../types/yahoo-finance.js';
export declare class Quote {
    readonly price: number;
    readonly currency: string;
    readonly name: string;
    constructor({ regularMarketPrice, postMarketPrice, preMarketPrice, currency, shortName, longName }: YahooQuoteResponse);
}
export declare class DividendEvent {
    readonly date: Date;
    readonly amount: number;
    constructor({ date, amount }: {
        date: number | string | Date;
        amount: number;
    });
    get year(): number;
    isValid(): boolean;
}
export declare class Fundamentals {
    readonly operatingCashFlow: number;
    readonly capitalExpenditure: number;
    readonly cashDividendsPaid: number;
    readonly netIncome: number;
    readonly payoutRatio: number;
    constructor(data?: YahooFundamentalsData);
    private extractValue;
    get freeCashFlow(): number;
    get fcfPayoutRatio(): number;
    get fcfCoverage(): number;
    get epsPayoutRatio(): number;
}
