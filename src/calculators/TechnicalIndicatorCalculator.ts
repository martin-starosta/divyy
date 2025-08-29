import { AlphaVantageTimeSeriesDaily } from "../services/AlphaVantageService.js";

export class TechnicalIndicatorCalculator {
  static calculateEMA(data: number[], period: number): number[] {
    if (data.length < period) {
      return [];
    }

    const ema = new Array(data.length).fill(NaN);
    let sum = 0;

    // Calculate the initial SMA
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    ema[period - 1] = sum / period;

    // Calculate the EMA for the rest of the data
    const multiplier = 2 / (period + 1);
    for (let i = period; i < data.length; i++) {
      ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
  }

  static extractClosePricesFromAlphaVantage(timeSeries: AlphaVantageTimeSeriesDaily): number[] {
    const dailyData = timeSeries["Time Series (Daily)"];
    if (!dailyData) {
      return [];
    }

    const dates = Object.keys(dailyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return dates.map(date => parseFloat(dailyData[date]["4. close"]));
  }

  static extractClosePricesFromYahoo(historicalPrices: {date: Date, close: number}[]): number[] {
    // Sort by date ascending to ensure correct EMA calculation
    const sortedPrices = historicalPrices.sort((a, b) => a.date.getTime() - b.date.getTime());
    return sortedPrices.map(data => data.close);
  }

  // Unified method for extracting close prices from either source
  static extractClosePrices(data: AlphaVantageTimeSeriesDaily | {date: Date, close: number}[] | null): number[] {
    if (!data) {
      return [];
    }
    
    if (this.isAlphaVantageData(data)) {
      return this.extractClosePricesFromAlphaVantage(data);
    } else {
      return this.extractClosePricesFromYahoo(data);
    }
  }

  private static isAlphaVantageData(data: any): data is AlphaVantageTimeSeriesDaily {
    return data && typeof data === 'object' && 'Time Series (Daily)' in data;
  }
}
