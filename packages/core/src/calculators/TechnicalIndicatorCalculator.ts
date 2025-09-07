import { AlphaVantageTimeSeriesDaily } from "../services/AlphaVantageService";

export interface MacdData {
  macdLine: number | null;
  signalLine: number | null;
  histogram: number | null;
}

export interface RsiData {
  rsi: number | null;
  period: number;
}

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

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param data Array of closing prices (in chronological order, oldest first)
   * @param fastPeriod Fast EMA period (default: 12)
   * @param slowPeriod Slow EMA period (default: 26)
   * @param signalPeriod Signal line EMA period (default: 9)
   * @returns MACD data with current values
   */
  static calculateMACD(
    data: number[], 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ): MacdData {
    // Need at least slowPeriod + signalPeriod data points for meaningful MACD
    const minDataPoints = slowPeriod + signalPeriod;
    if (data.length < minDataPoints) {
      return {
        macdLine: null,
        signalLine: null,
        histogram: null
      };
    }

    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    // Calculate MACD line (fast EMA - slow EMA)
    const macdLine: number[] = [];
    for (let i = slowPeriod - 1; i < data.length; i++) {
      if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }

    // Calculate signal line (EMA of MACD line)
    const signalEMA = this.calculateEMA(macdLine, signalPeriod);

    // Calculate histogram (MACD line - signal line)
    const currentMacd = macdLine.length > 0 ? macdLine[macdLine.length - 1] : null;
    const currentSignal = signalEMA.length > 0 ? signalEMA[signalEMA.length - 1] : null;
    const currentHistogram = (currentMacd !== null && currentSignal !== null && !isNaN(currentSignal)) 
      ? currentMacd - currentSignal 
      : null;

    return {
      macdLine: currentMacd,
      signalLine: currentSignal,
      histogram: currentHistogram
    };
  }

  /**
   * Analyze MACD signals for trading insights
   * @param macd Current MACD data
   * @param previousMacd Previous MACD data (optional, for trend analysis)
   * @returns MACD analysis with signals and trend strength
   */
  static analyzeMACD(macd: MacdData, previousMacd?: MacdData): {
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    crossover: 'bullish_crossover' | 'bearish_crossover' | 'none';
    fundamentalConcerns: string[];
  } {
    const fundamentalConcerns: string[] = [];
    
    // If no MACD data available
    if (macd.macdLine === null || macd.signalLine === null || macd.histogram === null) {
      fundamentalConcerns.push('MACD data unavailable');
      return {
        signal: 'neutral',
        strength: 'weak',
        crossover: 'none',
        fundamentalConcerns
      };
    }

    // Determine signal based on MACD position relative to signal line
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (macd.macdLine > macd.signalLine) {
      signal = 'bullish';
    } else if (macd.macdLine < macd.signalLine) {
      signal = 'bearish';
    }

    // Determine crossover if previous data is available
    let crossover: 'bullish_crossover' | 'bearish_crossover' | 'none' = 'none';
    if (previousMacd && previousMacd.macdLine !== null && previousMacd.signalLine !== null) {
      const wasAbove = previousMacd.macdLine > previousMacd.signalLine;
      const isAbove = macd.macdLine > macd.signalLine;
      
      if (!wasAbove && isAbove) {
        crossover = 'bullish_crossover';
      } else if (wasAbove && !isAbove) {
        crossover = 'bearish_crossover';
      }
    }

    // Determine strength based on histogram magnitude and distance from zero
    let strength: 'strong' | 'moderate' | 'weak' = 'weak';
    const histogramAbs = Math.abs(macd.histogram);
    const macdAbs = Math.abs(macd.macdLine);
    
    if (histogramAbs > 0.5 && macdAbs > 1.0) {
      strength = 'strong';
    } else if (histogramAbs > 0.2 && macdAbs > 0.5) {
      strength = 'moderate';
    }

    // Add fundamental concerns based on MACD analysis
    if (signal === 'bearish' && strength === 'strong') {
      fundamentalConcerns.push('Strong bearish MACD signal may indicate fundamental weakness');
    }
    
    if (crossover === 'bearish_crossover') {
      fundamentalConcerns.push('Recent bearish MACD crossover suggests potential trend reversal');
    }

    if (macd.histogram < -0.5) {
      fundamentalConcerns.push('MACD histogram strongly negative - momentum deteriorating');
    }

    return {
      signal,
      strength,
      crossover,
      fundamentalConcerns
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * @param data Array of closing prices (in chronological order, oldest first)
   * @param period RSI period (default: 14)
   * @returns RSI data with current value
   */
  static calculateRSI(data: number[], period: number = 14): RsiData {
    // Need at least period + 1 data points for RSI calculation
    if (data.length < period + 1) {
      return {
        rsi: null,
        period
      };
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial averages using SMA for first period
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate subsequent averages using Wilder's smoothing method
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }

    // Calculate RSI
    if (avgLoss === 0) {
      return { rsi: 100, period }; // All gains, no losses
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return {
      rsi: Math.round(rsi * 100) / 100, // Round to 2 decimal places
      period
    };
  }

  /**
   * Analyze RSI signals for trading insights
   * @param rsiData Current RSI data
   * @param previousRsi Previous RSI value (optional, for trend analysis)
   * @returns RSI analysis with signals and conditions
   */
  static analyzeRSI(rsiData: RsiData, previousRsi?: number): {
    signal: 'overbought' | 'oversold' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
    condition: 'extreme_overbought' | 'extreme_oversold' | 'normal';
    trend: 'rising' | 'falling' | 'stable';
    fundamentalConcerns: string[];
  } {
    const fundamentalConcerns: string[] = [];
    
    // If no RSI data available
    if (rsiData.rsi === null) {
      fundamentalConcerns.push('RSI data unavailable');
      return {
        signal: 'neutral',
        strength: 'weak',
        condition: 'normal',
        trend: 'stable',
        fundamentalConcerns
      };
    }

    const rsi = rsiData.rsi;
    
    // Determine signal based on RSI thresholds
    let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    let condition: 'extreme_overbought' | 'extreme_oversold' | 'normal' = 'normal';
    
    if (rsi >= 70) {
      signal = 'overbought';
      if (rsi >= 80) {
        condition = 'extreme_overbought';
      }
    } else if (rsi <= 30) {
      signal = 'oversold';
      if (rsi <= 20) {
        condition = 'extreme_oversold';
      }
    }

    // Determine strength based on how extreme the RSI is
    let strength: 'strong' | 'moderate' | 'weak' = 'weak';
    if (rsi >= 80 || rsi <= 20) {
      strength = 'strong';
    } else if (rsi >= 70 || rsi <= 30) {
      strength = 'moderate';
    }

    // Determine trend if previous RSI is available
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (previousRsi !== undefined) {
      const rsiChange = rsi - previousRsi;
      if (Math.abs(rsiChange) > 2) { // Significant change threshold
        trend = rsiChange > 0 ? 'rising' : 'falling';
      }
    }

    // Add fundamental concerns based on RSI analysis
    if (condition === 'extreme_overbought') {
      fundamentalConcerns.push('Stock severely overbought - potential price correction ahead');
    } else if (signal === 'overbought' && strength === 'moderate') {
      fundamentalConcerns.push('Stock overbought - momentum may be unsustainable');
    }

    if (condition === 'extreme_oversold') {
      fundamentalConcerns.push('Stock severely oversold - may indicate fundamental issues or opportunity');
    }

    if (rsi > 70 && trend === 'rising') {
      fundamentalConcerns.push('RSI rising into overbought territory - consider timing of entry');
    }

    return {
      signal,
      strength,
      condition,
      trend,
      fundamentalConcerns
    };
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
