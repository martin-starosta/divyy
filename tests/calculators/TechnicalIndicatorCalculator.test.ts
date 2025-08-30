import { describe, it, expect } from 'vitest';
import { TechnicalIndicatorCalculator } from '../../src/calculators/TechnicalIndicatorCalculator.js';
import type { AlphaVantageTimeSeriesDaily } from '../../src/services/AlphaVantageService.js';

describe('TechnicalIndicatorCalculator', () => {
  describe('calculateEMA', () => {
    it('should return empty array for insufficient data', () => {
      const data = [100, 101, 102];
      const result = TechnicalIndicatorCalculator.calculateEMA(data, 20);
      expect(result).toEqual([]);
    });

    it('should calculate EMA20 correctly', () => {
      // Create 25 days of price data
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i * 0.5);
      const result = TechnicalIndicatorCalculator.calculateEMA(prices, 20);
      
      expect(result.length).toBe(25);
      expect(result[19]).toBeCloseTo(104.75, 1); // First EMA value (SMA of first 20 values)
      expect(result[24]).toBeCloseTo(107.25, 1); // Last EMA value
      expect(result[0]).toBeNaN(); // First 19 values should be NaN
    });

    it('should calculate EMA50 correctly', () => {
      const prices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.3);
      const result = TechnicalIndicatorCalculator.calculateEMA(prices, 50);
      
      expect(result.length).toBe(60);
      expect(result[49]).toBeCloseTo(107.35, 1); // First EMA value (SMA of first 50 values)
      expect(result[59]).toBeCloseTo(110.35, 1); // Last EMA value
    });

    it('should calculate EMA200 correctly', () => {
      const prices = Array.from({ length: 250 }, (_, i) => 100 + i * 0.1);
      const result = TechnicalIndicatorCalculator.calculateEMA(prices, 200);
      
      expect(result.length).toBe(250);
      expect(result[199]).toBeCloseTo(109.95, 1); // First EMA value (SMA of first 200 values)
      expect(result[249]).toBeCloseTo(114.95, 1); // Last EMA value
    });

    it('should handle volatile price data', () => {
      const prices = [100, 95, 105, 90, 110, 85, 115, 80, 120, 75];
      const result = TechnicalIndicatorCalculator.calculateEMA(prices, 5);
      
      expect(result.length).toBe(10);
      expect(result[4]).toBeCloseTo(100, 1); // First EMA value (SMA of first 5 values)
      expect(result[9]).toBeCloseTo(93.64, 1); // Last EMA value
    });
  });

  describe('extractClosePricesFromAlphaVantage', () => {
    it('should extract close prices from Alpha Vantage data', () => {
      const timeSeries: AlphaVantageTimeSeriesDaily = {
        "Meta Data": {
          "1. Information": "Daily Prices (open, high, low, close) and Volumes",
          "2. Symbol": "AAPL",
          "3. Last Refreshed": "2024-01-03",
          "4. Output Size": "Compact",
          "5. Time Zone": "US/Eastern"
        },
        "Time Series (Daily)": {
          "2024-01-03": {
            "1. open": "100.00",
            "2. high": "102.00",
            "3. low": "99.00",
            "4. close": "101.50",
            "5. adjusted close": "101.50",
            "6. volume": "1000000",
            "7. dividend amount": "0.00",
            "8. split coefficient": "1.0"
          },
          "2024-01-02": {
            "1. open": "99.00",
            "2. high": "101.00",
            "3. low": "98.00",
            "4. close": "100.00",
            "5. adjusted close": "100.00",
            "6. volume": "1000000",
            "7. dividend amount": "0.00",
            "8. split coefficient": "1.0"
          },
          "2024-01-01": {
            "1. open": "98.00",
            "2. high": "100.00",
            "3. low": "97.00",
            "4. close": "99.00",
            "5. adjusted close": "99.00",
            "6. volume": "1000000",
            "7. dividend amount": "0.00",
            "8. split coefficient": "1.0"
          }
        }
      };

      const result = TechnicalIndicatorCalculator.extractClosePricesFromAlphaVantage(timeSeries);
      
      expect(result).toEqual([99.00, 100.00, 101.50]);
    });

    it('should return empty array for invalid data', () => {
      const timeSeries = {} as AlphaVantageTimeSeriesDaily;
      const result = TechnicalIndicatorCalculator.extractClosePricesFromAlphaVantage(timeSeries);
      expect(result).toEqual([]);
    });

    it('should handle empty time series', () => {
      const timeSeries: AlphaVantageTimeSeriesDaily = {
        "Meta Data": {
          "1. Information": "Daily Prices",
          "2. Symbol": "AAPL",
          "3. Last Refreshed": "2024-01-03",
          "4. Output Size": "Compact",
          "5. Time Zone": "US/Eastern"
        },
        "Time Series (Daily)": {}
      };

      const result = TechnicalIndicatorCalculator.extractClosePricesFromAlphaVantage(timeSeries);
      expect(result).toEqual([]);
    });
  });

  describe('extractClosePricesFromYahoo', () => {
    it('should extract close prices from Yahoo Finance data', () => {
      const historicalPrices = [
        { date: new Date('2024-01-01'), close: 99.00 },
        { date: new Date('2024-01-02'), close: 100.00 },
        { date: new Date('2024-01-03'), close: 101.50 }
      ];

      const result = TechnicalIndicatorCalculator.extractClosePricesFromYahoo(historicalPrices);
      
      expect(result).toEqual([99.00, 100.00, 101.50]);
    });

    it('should sort data by date ascending', () => {
      const historicalPrices = [
        { date: new Date('2024-01-03'), close: 101.50 },
        { date: new Date('2024-01-01'), close: 99.00 },
        { date: new Date('2024-01-02'), close: 100.00 }
      ];

      const result = TechnicalIndicatorCalculator.extractClosePricesFromYahoo(historicalPrices);
      
      expect(result).toEqual([99.00, 100.00, 101.50]);
    });

    it('should handle empty array', () => {
      const result = TechnicalIndicatorCalculator.extractClosePricesFromYahoo([]);
      expect(result).toEqual([]);
    });
  });

  describe('extractClosePrices (unified method)', () => {
    it('should detect and handle Alpha Vantage data', () => {
      const avData = {
        "Time Series (Daily)": {
          "2024-01-01": { "4. close": "99.00" },
          "2024-01-02": { "4. close": "100.00" },
          "2024-01-03": { "4. close": "101.50" }
        }
      };

      const result = TechnicalIndicatorCalculator.extractClosePrices(avData);
      expect(result).toEqual([99.00, 100.00, 101.50]);
    });

    it('should detect and handle Yahoo Finance data', () => {
      const yahooData = [
        { date: new Date('2024-01-01'), close: 99.00 },
        { date: new Date('2024-01-02'), close: 100.00 },
        { date: new Date('2024-01-03'), close: 101.50 }
      ];

      const result = TechnicalIndicatorCalculator.extractClosePrices(yahooData);
      expect(result).toEqual([99.00, 100.00, 101.50]);
    });

    it('should handle invalid data gracefully', () => {
      const invalidData = null;
      const result = TechnicalIndicatorCalculator.extractClosePrices(invalidData as any);
      expect(result).toEqual([]);
    });

    it('should handle null data gracefully', () => {
      const result = TechnicalIndicatorCalculator.extractClosePrices(null as any);
      expect(result).toEqual([]);
    });
  });

  describe('RSI Calculation', () => {
    describe('calculateRSI', () => {
      it('should return null for insufficient data', () => {
        const data = [100, 101, 102, 103]; // Only 4 points, need 15 (14 + 1)
        const result = TechnicalIndicatorCalculator.calculateRSI(data, 14);
        expect(result.rsi).toBe(null);
        expect(result.period).toBe(14);
      });

      it('should calculate RSI correctly with trending up data', () => {
        // Create 20 days of generally upward trending data
        const prices = [
          44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
          46.03, 46.83, 47.69, 46.49, 46.26, 47.09, 46.66, 46.80, 46.23, 46.95
        ];
        
        const result = TechnicalIndicatorCalculator.calculateRSI(prices, 14);
        
        expect(result.rsi).not.toBe(null);
        expect(result.rsi).toBeGreaterThan(40);
        expect(result.rsi).toBeLessThan(80);
        expect(result.period).toBe(14);
      });

      it('should calculate RSI correctly with trending down data', () => {
        // Create 20 days of generally downward trending data with some small bounces
        const prices = [
          50, 49.5, 49, 48.8, 48, 47.8, 47, 46.9, 46, 45.8,
          45, 44.8, 44, 43.9, 43, 42.8, 42, 41.9, 41, 40.8
        ];
        
        const result = TechnicalIndicatorCalculator.calculateRSI(prices, 14);
        
        expect(result.rsi).not.toBe(null);
        expect(result.rsi).toBeGreaterThanOrEqual(0); // RSI can be 0 if all losses
        expect(result.rsi).toBeLessThan(50);
        expect(result.period).toBe(14);
      });

      it('should return RSI 100 for all gains scenario', () => {
        // All gains, no losses
        const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
                       110, 111, 112, 113, 114, 115, 116, 117, 118, 119];
        
        const result = TechnicalIndicatorCalculator.calculateRSI(prices, 14);
        
        expect(result.rsi).toBe(100);
        expect(result.period).toBe(14);
      });

      it('should work with custom period', () => {
        const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i * 0.3) * 2);
        
        const result = TechnicalIndicatorCalculator.calculateRSI(prices, 21);
        
        expect(result.rsi).not.toBe(null);
        expect(result.period).toBe(21);
      });
    });

    describe('analyzeRSI', () => {
      it('should identify overbought conditions', () => {
        const rsiData = { rsi: 75, period: 14 };
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData);
        
        expect(analysis.signal).toBe('overbought');
        expect(analysis.strength).toBe('moderate');
        expect(analysis.condition).toBe('normal');
        expect(analysis.fundamentalConcerns.length).toBeGreaterThan(0);
      });

      it('should identify extreme overbought conditions', () => {
        const rsiData = { rsi: 85, period: 14 };
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData);
        
        expect(analysis.signal).toBe('overbought');
        expect(analysis.strength).toBe('strong');
        expect(analysis.condition).toBe('extreme_overbought');
        expect(analysis.fundamentalConcerns).toContain('Stock severely overbought - potential price correction ahead');
      });

      it('should identify oversold conditions', () => {
        const rsiData = { rsi: 25, period: 14 };
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData);
        
        expect(analysis.signal).toBe('oversold');
        expect(analysis.strength).toBe('moderate');
        expect(analysis.condition).toBe('normal');
      });

      it('should identify extreme oversold conditions', () => {
        const rsiData = { rsi: 15, period: 14 };
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData);
        
        expect(analysis.signal).toBe('oversold');
        expect(analysis.strength).toBe('strong');
        expect(analysis.condition).toBe('extreme_oversold');
        expect(analysis.fundamentalConcerns).toContain('Stock severely oversold - may indicate fundamental issues or opportunity');
      });

      it('should identify neutral conditions', () => {
        const rsiData = { rsi: 50, period: 14 };
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData);
        
        expect(analysis.signal).toBe('neutral');
        expect(analysis.strength).toBe('weak');
        expect(analysis.condition).toBe('normal');
        expect(analysis.fundamentalConcerns.length).toBe(0);
      });

      it('should detect rising trend', () => {
        const rsiData = { rsi: 75, period: 14 };
        const previousRsi = 70;
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData, previousRsi);
        
        expect(analysis.trend).toBe('rising');
        expect(analysis.fundamentalConcerns).toContain('RSI rising into overbought territory - consider timing of entry');
      });

      it('should detect falling trend', () => {
        const rsiData = { rsi: 65, period: 14 };
        const previousRsi = 70;
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData, previousRsi);
        
        expect(analysis.trend).toBe('falling');
      });

      it('should detect stable trend', () => {
        const rsiData = { rsi: 50, period: 14 };
        const previousRsi = 51; // Change less than 2 points
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData, previousRsi);
        
        expect(analysis.trend).toBe('stable');
      });

      it('should handle null RSI data', () => {
        const rsiData = { rsi: null, period: 14 };
        const analysis = TechnicalIndicatorCalculator.analyzeRSI(rsiData);
        
        expect(analysis.signal).toBe('neutral');
        expect(analysis.strength).toBe('weak');
        expect(analysis.condition).toBe('normal');
        expect(analysis.trend).toBe('stable');
        expect(analysis.fundamentalConcerns).toContain('RSI data unavailable');
      });
    });
  });
});
