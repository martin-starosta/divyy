import yahooFinance from "yahoo-finance2";
import { Quote, DividendEvent, Fundamentals } from "../models/StockData.js";
export class YahooFinanceService {
    async getQuote(ticker) {
        const quote = await yahooFinance.quote(ticker);
        if (!quote) {
            throw new Error("No quote returned");
        }
        return new Quote(quote);
    }
    async getDividendEvents(ticker, years = 15) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - years);
        const chart = await yahooFinance.chart(ticker, {
            period1: startDate,
            period2: endDate,
            interval: "1mo",
            events: "dividends"
        });
        let divs = [];
        if (chart?.events?.dividends && typeof chart.events.dividends === 'object') {
            divs = Object.values(chart.events.dividends);
        }
        else if (Array.isArray(chart?.events)) {
            divs = chart.events;
        }
        return (divs || [])
            .map(d => new DividendEvent({
            date: d.date || d.dateUTC || d.timestamp || new Date(),
            amount: d.amount ?? d.divCash ?? d.value ?? 0
        }))
            .filter(d => d.isValid());
    }
    async getFundamentals(ticker, years = 15) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - years);
        let fundamentals = new Fundamentals();
        try {
            const fundamentalsData = await yahooFinance.fundamentalsTimeSeries(ticker, {
                period1: startDate,
                period2: endDate,
                type: "annual",
                module: "all"
            });
            if (fundamentalsData?.timeSeries?.[0]) {
                fundamentals = new Fundamentals(fundamentalsData.timeSeries[0]);
            }
        }
        catch (error) {
            console.error("Fundamentals API failed, trying quoteSummary...");
        }
        try {
            const quoteSummary = await yahooFinance.quoteSummary(ticker, {
                modules: ["summaryDetail", "defaultKeyStatistics", "financialData"]
            });
            if (isNaN(fundamentals.payoutRatio)) {
                const payoutRatio = quoteSummary?.summaryDetail?.payoutRatio ??
                    quoteSummary?.defaultKeyStatistics?.payoutRatio;
                if (payoutRatio) {
                    // Create new Fundamentals with updated payout ratio
                    fundamentals = new Fundamentals({
                        OperatingCashFlow: { raw: fundamentals.operatingCashFlow },
                        CapitalExpenditure: { raw: fundamentals.capitalExpenditure },
                        CashDividendsPaid: { raw: fundamentals.cashDividendsPaid },
                        NetIncome: { raw: fundamentals.netIncome },
                        payoutRatio: payoutRatio
                    });
                }
            }
        }
        catch (error) {
            console.error("QuoteSummary also failed");
        }
        return fundamentals;
    }
}
