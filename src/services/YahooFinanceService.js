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

    const divs = chart?.events?.dividends 
      ? Object.values(chart.events.dividends)
      : (Array.isArray(chart?.events) ? chart.events : []);
    
    return (divs || [])
      .map(d => new DividendEvent({
        date: d.date || d.dateUTC || d.timestamp,
        amount: d.amount ?? d.divCash ?? d.value
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
    } catch (error) {
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
          fundamentals.payoutRatio = fundamentals.extractValue(payoutRatio);
        }
      }
    } catch (error) {
      console.error("QuoteSummary also failed");
    }
    
    return fundamentals;
  }
}