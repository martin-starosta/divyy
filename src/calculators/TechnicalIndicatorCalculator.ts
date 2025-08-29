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

  static extractClosePrices(timeSeries: AlphaVantageTimeSeriesDaily): number[] {
    const dailyData = timeSeries["Time Series (Daily)"];
    if (!dailyData) {
      return [];
    }

    const dates = Object.keys(dailyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return dates.map(date => parseFloat(dailyData[date]["4. close"]));
  }
}
