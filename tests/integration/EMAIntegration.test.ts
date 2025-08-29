import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechnicalIndicatorCalculator } from '../../src/calculators/TechnicalIndicatorCalculator.js';
import { ScoreCalculator } from '../../src/calculators/ScoreCalculator.js';
import type { EmaData } from '../../src/models/DividendAnalysis.js';

describe('EMA Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Full EMA Calculation Flow', () => {
    it('should simulate complete EMA calculation process', () => {
      // Step 1: Generate sample price data (simulating Alpha Vantage or Yahoo Finance)
      const samplePrices = Array.from({ length: 250 }, (_, i) => {
        const basePrice = 100;
        const trend = i * 0.1; // Slight upward trend
        const volatility = (Math.random() - 0.5) * 2; // Random volatility
        return Math.max(50, basePrice + trend + volatility);
      });

      // Step 2: Calculate EMAs
      const ema20 = TechnicalIndicatorCalculator.calculateEMA(samplePrices, 20);
      const ema50 = TechnicalIndicatorCalculator.calculateEMA(samplePrices, 50);
      const ema200 = TechnicalIndicatorCalculator.calculateEMA(samplePrices, 200);

      // Step 3: Extract current values
      const currentPrice = samplePrices[samplePrices.length - 1];
      const currentEma20 = ema20[ema20.length - 1];
      const currentEma50 = ema50[ema50.length - 1];
      const currentEma200 = ema200[ema200.length - 1];

      // Step 4: Create EMA data object
      const emaData: EmaData = {
        ema20: currentEma20,
        ema50: currentEma50,
        ema200: currentEma200
      };

      // Step 5: Calculate trend score
      const trendScore = ScoreCalculator.calculateTrendScore(currentPrice, emaData);

      // Step 6: Analyze trends
      const trendAnalysis = ScoreCalculator.analyzeEMATrends(currentPrice, emaData);

      // Assertions
      expect(ema20.length).toBe(250);
      expect(ema50.length).toBe(250);
      expect(ema200.length).toBe(250);
      expect(currentEma20).toBeGreaterThan(0);
      expect(currentEma50).toBeGreaterThan(0);
      expect(currentEma200).toBeGreaterThan(0);
      expect(trendScore).toBeGreaterThanOrEqual(0);
      expect(trendScore).toBeLessThanOrEqual(100);
      expect(trendAnalysis.trendStrength).toBeDefined();
    });

    it('should handle data source fallback simulation', () => {
      // Simulate Alpha Vantage data format
      const avData = {
        "Time Series (Daily)": {
          "2024-01-01": { "4. close": "100.00" },
          "2024-01-02": { "4. close": "101.00" },
          "2024-01-03": { "4. close": "102.00" }
        }
      };

      // Simulate Yahoo Finance data format
      const yahooData = [
        { date: new Date('2024-01-01'), close: 100.00 },
        { date: new Date('2024-01-02'), close: 101.00 },
        { date: new Date('2024-01-03'), close: 102.00 }
      ];

      // Test unified extraction method
      const avPrices = TechnicalIndicatorCalculator.extractClosePrices(avData);
      const yahooPrices = TechnicalIndicatorCalculator.extractClosePrices(yahooData);

      expect(avPrices).toEqual([100.00, 101.00, 102.00]);
      expect(yahooPrices).toEqual([100.00, 101.00, 102.00]);
      expect(avPrices).toEqual(yahooPrices);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle bullish market scenario', () => {
      // Simulate a stock in a strong uptrend
      const prices = Array.from({ length: 250 }, (_, i) => 100 + i * 0.5);
      const currentPrice = prices[prices.length - 1]; // ~222.5

      const ema20 = TechnicalIndicatorCalculator.calculateEMA(prices, 20);
      const ema50 = TechnicalIndicatorCalculator.calculateEMA(prices, 50);
      const ema200 = TechnicalIndicatorCalculator.calculateEMA(prices, 200);

      const emaData: EmaData = {
        ema20: ema20[ema20.length - 1],
        ema50: ema50[ema50.length - 1],
        ema200: ema200[ema200.length - 1]
      };

      const trendScore = ScoreCalculator.calculateTrendScore(currentPrice, emaData);
      const trendAnalysis = ScoreCalculator.analyzeEMATrends(currentPrice, emaData);

      expect(trendScore).toBe(100); // Perfect score
      expect(trendAnalysis.trendStrength).toBe('strong_bullish');
      expect(trendAnalysis.fundamentalConcerns).toEqual([]);
    });

    it('should handle bearish market scenario', () => {
      // Simulate a stock in a strong downtrend
      const prices = Array.from({ length: 250 }, (_, i) => 150 - i * 0.3);
      const currentPrice = prices[prices.length - 1]; // ~75

      const ema20 = TechnicalIndicatorCalculator.calculateEMA(prices, 20);
      const ema50 = TechnicalIndicatorCalculator.calculateEMA(prices, 50);
      const ema200 = TechnicalIndicatorCalculator.calculateEMA(prices, 200);

      const emaData: EmaData = {
        ema20: ema20[ema20.length - 1],
        ema50: ema50[ema50.length - 1],
        ema200: ema200[ema200.length - 1]
      };

      const trendScore = ScoreCalculator.calculateTrendScore(currentPrice, emaData);
      const trendAnalysis = ScoreCalculator.analyzeEMATrends(currentPrice, emaData);

      expect(trendScore).toBe(0); // Penalized
      expect(trendAnalysis.trendStrength).toBe('strong_bearish');
      expect(trendAnalysis.fundamentalConcerns).toContain('Stock trading below EMA200 - market may doubt fundamentals');
    });

    it('should handle sideways market scenario', () => {
      // Simulate a stock trading sideways
      const prices = Array.from({ length: 250 }, (_, i) => {
        const basePrice = 100;
        const cycle = Math.sin(i * 0.1) * 10; // Oscillating pattern
        return basePrice + cycle;
      });
      const currentPrice = prices[prices.length - 1];

      const ema20 = TechnicalIndicatorCalculator.calculateEMA(prices, 20);
      const ema50 = TechnicalIndicatorCalculator.calculateEMA(prices, 50);
      const ema200 = TechnicalIndicatorCalculator.calculateEMA(prices, 200);

      const emaData: EmaData = {
        ema20: ema20[ema20.length - 1],
        ema50: ema50[ema50.length - 1],
        ema200: ema200[ema200.length - 1]
      };

      const trendScore = ScoreCalculator.calculateTrendScore(currentPrice, emaData);
      const trendAnalysis = ScoreCalculator.analyzeEMATrends(currentPrice, emaData);

      // In sideways market, score depends on current position relative to EMAs
      expect(trendScore).toBeGreaterThanOrEqual(0);
      expect(trendScore).toBeLessThanOrEqual(100);
      expect(['neutral', 'bullish', 'bearish']).toContain(trendAnalysis.trendStrength);
    });
  });

  describe('Edge Cases', () => {
    it('should handle insufficient data gracefully', () => {
      const prices = [100, 101, 102]; // Only 3 data points
      
      const ema20 = TechnicalIndicatorCalculator.calculateEMA(prices, 20);
      const ema50 = TechnicalIndicatorCalculator.calculateEMA(prices, 50);
      const ema200 = TechnicalIndicatorCalculator.calculateEMA(prices, 200);

      expect(ema20).toEqual([]);
      expect(ema50).toEqual([]);
      expect(ema200).toEqual([]);
    });

    it('should handle exactly minimum required data', () => {
      const prices = Array.from({ length: 200 }, (_, i) => 100 + i * 0.1);
      
      const ema200 = TechnicalIndicatorCalculator.calculateEMA(prices, 200);
      
      expect(ema200.length).toBe(200);
      expect(ema200[199]).toBeCloseTo(109.95, 1); // First and only EMA value
    });

    it('should handle extreme price movements', () => {
      const prices = [100, 200, 50, 300, 25, 400]; // Extreme volatility
      
      const ema5 = TechnicalIndicatorCalculator.calculateEMA(prices, 5);
      
      expect(ema5.length).toBe(6);
      // First EMA value: SMA of [100, 200, 50, 300, 25] = 135
      expect(ema5[4]).toBeCloseTo(135, 1); // First EMA value (SMA of first 5 values)
      expect(ema5[5]).toBeCloseTo(223.33, 1); // Last EMA value (EMA calculation with 400)
    });
  });

  describe('Data Source Compatibility', () => {
    it('should handle both Alpha Vantage and Yahoo Finance formats', () => {
      // Test Alpha Vantage format
      const avFormat = {
        "Time Series (Daily)": {
          "2024-01-01": { "4. close": "100.50" },
          "2024-01-02": { "4. close": "101.20" },
          "2024-01-03": { "4. close": "99.80" }
        }
      };

      // Test Yahoo Finance format
      const yahooFormat = [
        { date: new Date('2024-01-01'), close: 100.50 },
        { date: new Date('2024-01-02'), close: 101.20 },
        { date: new Date('2024-01-03'), close: 99.80 }
      ];

      const avPrices = TechnicalIndicatorCalculator.extractClosePrices(avFormat);
      const yahooPrices = TechnicalIndicatorCalculator.extractClosePrices(yahooFormat);

      expect(avPrices).toEqual([100.50, 101.20, 99.80]);
      expect(yahooPrices).toEqual([100.50, 101.20, 99.80]);
    });

    it('should handle malformed data gracefully', () => {
      const malformedData = {
        "Time Series (Daily)": {
          "2024-01-01": { "4. close": "invalid" },
          "2024-01-02": { "4. close": "101.20" }
        }
      };

      const result = TechnicalIndicatorCalculator.extractClosePrices(malformedData);
      
      // Should handle invalid numbers gracefully
      expect(result.length).toBe(2);
      expect(result[0]).toBeNaN();
      expect(result[1]).toBe(101.20);
    });
  });
});
