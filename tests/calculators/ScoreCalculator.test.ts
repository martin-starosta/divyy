import { describe, it, expect } from 'vitest';
import { ScoreCalculator } from '../../src/calculators/ScoreCalculator.js';
import type { EmaData } from '../../src/models/DividendAnalysis.js';

describe('ScoreCalculator', () => {
  describe('calculateTrendScore', () => {
    it('should return 0 for missing EMA data', () => {
      const price = 100;
      const ema: EmaData = { ema20: null, ema50: null, ema200: null };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(0);
    });

    it('should return 0 for missing price', () => {
      const price = 0;
      const ema: EmaData = { ema20: 95, ema50: 90, ema200: 85 };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(0);
    });

    it('should give perfect score for stock above all EMAs', () => {
      const price = 105;
      const ema: EmaData = { ema20: 100, ema50: 95, ema200: 90 };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(100); // 50 + 30 + 20
    });

    it('should penalize stock below EMA200 (market doubts fundamentals)', () => {
      const price = 85;
      const ema: EmaData = { ema20: 95, ema50: 90, ema200: 100 };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(0); // -20 + 30 + 20 = 30, but clamped to 0
    });

    it('should handle mixed signals correctly', () => {
      const price = 92;
      const ema: EmaData = { ema20: 90, ema50: 95, ema200: 100 };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(0); // -20 + 0 + 20 = 0
    });

    it('should return 0 for partial EMA data', () => {
      const price = 105;
      const ema: EmaData = { ema20: null, ema50: 95, ema200: 90 };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(0); // Returns 0 if any EMA is missing
    });

    it('should return 0 for missing EMA20 data', () => {
      const price = 105;
      const ema: EmaData = { ema20: null, ema50: 95, ema200: 90 };
      
      const result = ScoreCalculator.calculateTrendScore(price, ema);
      expect(result).toBe(0); // Returns 0 if any EMA is missing
    });
  });

  describe('analyzeEMATrends', () => {
    it('should return neutral for missing EMA data', () => {
      const price = 100;
      const ema: EmaData = { ema20: null, ema50: null, ema200: null };
      
      const result = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(result.isUnderEMA200).toBe(false);
      expect(result.isUnderEMA50).toBe(false);
      expect(result.isUnderEMA20).toBe(false);
      expect(result.fundamentalConcerns).toEqual(['EMA data unavailable']);
      expect(result.trendStrength).toBe('neutral');
    });

    it('should detect strong bullish trend', () => {
      const price = 105;
      const ema: EmaData = { ema20: 100, ema50: 95, ema200: 90 };
      
      const result = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(result.isUnderEMA200).toBe(false);
      expect(result.isUnderEMA50).toBe(false);
      expect(result.isUnderEMA20).toBe(false);
      expect(result.fundamentalConcerns).toEqual([]);
      expect(result.trendStrength).toBe('strong_bullish');
    });

    it('should detect strong bearish trend with fundamental concerns', () => {
      const price = 85;
      const ema: EmaData = { ema20: 95, ema50: 90, ema200: 100 };
      
      const result = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(result.isUnderEMA200).toBe(true);
      expect(result.isUnderEMA50).toBe(true);
      expect(result.isUnderEMA20).toBe(true);
      expect(result.fundamentalConcerns).toContain('Stock trading below EMA200 - market may doubt fundamentals');
      expect(result.fundamentalConcerns).toContain('Stock below EMA50 - medium-term trend is bearish');
      expect(result.fundamentalConcerns).toContain('Stock below EMA20 - short-term momentum is negative');
      expect(result.trendStrength).toBe('strong_bearish');
    });

    it('should detect bearish trend when below EMA200', () => {
      const price = 92;
      const ema: EmaData = { ema20: 90, ema50: 95, ema200: 100 };
      
      const result = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(result.isUnderEMA200).toBe(true);
      expect(result.isUnderEMA50).toBe(true);
      expect(result.isUnderEMA20).toBe(false);
      expect(result.fundamentalConcerns).toContain('Stock trading below EMA200 - market may doubt fundamentals');
      expect(result.fundamentalConcerns).toContain('Stock below EMA50 - medium-term trend is bearish');
      expect(result.trendStrength).toBe('strong_bearish');
    });

    it('should detect neutral trend for mixed signals', () => {
      const price = 95;
      const ema: EmaData = { ema20: 90, ema50: 100, ema200: 95 };
      
      const result = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(result.isUnderEMA200).toBe(false);
      expect(result.isUnderEMA50).toBe(true);
      expect(result.isUnderEMA20).toBe(false);
      expect(result.fundamentalConcerns).toContain('Stock below EMA50 - medium-term trend is bearish');
      expect(result.trendStrength).toBe('strong_bullish'); // Above EMA200 = 2 bullish, below EMA50 = 1 bearish = net bullish
    });

    it('should detect bullish trend when above EMA200 but below shorter EMAs', () => {
      const price = 105;
      const ema: EmaData = { ema20: 110, ema50: 108, ema200: 100 };
      
      const result = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(result.isUnderEMA200).toBe(false);
      expect(result.isUnderEMA50).toBe(true);
      expect(result.isUnderEMA20).toBe(true);
      expect(result.fundamentalConcerns).toContain('Stock below EMA50 - medium-term trend is bearish');
      expect(result.fundamentalConcerns).toContain('Stock below EMA20 - short-term momentum is negative');
      expect(result.trendStrength).toBe('bearish');
    });
  });

  describe('calculateDividendScores', () => {
    it('should calculate all scores correctly', () => {
      const fundamentals = {
        epsPayoutRatio: 0.5,
        fcfCoverage: 2.0
      };
      const streak = 10;
      const safeGrowth = 0.05;
      const quote = { price: 100 };
      const ema: EmaData = { ema20: 95, ema50: 90, ema200: 85 };
      
      const result = ScoreCalculator.calculateDividendScores(
        fundamentals as any,
        streak,
        safeGrowth,
        quote as any,
        ema,
        { macdLine: 0.5, signalLine: 0.3, histogram: 0.2 },
        { rsi: 50, period: 14 }
      );
      
      expect(result.payout).toBeGreaterThan(0);
      expect(result.fcf).toBeGreaterThan(0);
      expect(result.streak).toBeGreaterThan(0);
      expect(result.growth).toBeGreaterThan(0);
      expect(result.trend).toBeGreaterThan(0);
      expect(result.macd).toBeGreaterThan(0);
      expect(result.rsi).toBeGreaterThan(0);
    });

    it('should handle missing fundamental data', () => {
      const fundamentals = {
        epsPayoutRatio: NaN,
        fcfCoverage: NaN
      };
      const streak = 0;
      const safeGrowth = -0.1;
      const quote = { price: 100 };
      const ema: EmaData = { ema20: 95, ema50: 90, ema200: 85 };
      
      const result = ScoreCalculator.calculateDividendScores(
        fundamentals as any,
        streak,
        safeGrowth,
        quote as any,
        ema,
        { macdLine: null, signalLine: null, histogram: null },
        { rsi: null, period: 14 }
      );
      
      expect(result.payout).toBe(100); // Default for missing payout ratio
      expect(result.fcf).toBe(0); // Default for missing FCF data
      expect(result.streak).toBe(0); // 0 streak = 0 score
      expect(result.growth).toBe(0); // Negative growth = 0 score
      expect(result.trend).toBe(100); // Above all EMAs
      expect(result.macd).toBe(50); // Neutral score for missing MACD data
      expect(result.rsi).toBe(50); // Neutral score for missing RSI data
    });
  });

  describe('calculateTotalScore', () => {
    it('should calculate total score with correct weights', () => {
      const scores = {
        payout: 80,
        fcf: 70,
        streak: 60,
        growth: 50,
        trend: 40,
        macd: 50,
        rsi: 45
      };
      
      const result = ScoreCalculator.calculateTotalScore(scores as any);
      
      // Expected: (0.25 * 80) + (0.25 * 70) + (0.17 * 60) + (0.16 * 50) + (0.07 * 40) + (0.06 * 50) + (0.04 * 45) = 62.8
      expect(result).toBe(63); // Rounded
    });

    it('should handle perfect scores', () => {
      const scores = {
        payout: 100,
        fcf: 100,
        streak: 100,
        growth: 100,
        trend: 100,
        macd: 100,
        rsi: 100
      };
      
      const result = ScoreCalculator.calculateTotalScore(scores as any);
      expect(result).toBe(100);
    });

    it('should handle zero scores', () => {
      const scores = {
        payout: 0,
        fcf: 0,
        streak: 0,
        growth: 0,
        trend: 0,
        macd: 0,
        rsi: 0
      };
      
      const result = ScoreCalculator.calculateTotalScore(scores as any);
      expect(result).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle GM-like scenario (above all EMAs)', () => {
      const price = 58.61;
      const ema: EmaData = { ema20: 56.41, ema50: 53.95, ema200: 50.13 };
      
      const trendScore = ScoreCalculator.calculateTrendScore(price, ema);
      const trendAnalysis = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(trendScore).toBe(100); // Perfect score
      expect(trendAnalysis.trendStrength).toBe('strong_bullish');
      expect(trendAnalysis.fundamentalConcerns).toEqual([]);
    });

    it('should handle bearish scenario (below EMA200)', () => {
      const price = 45.00;
      const ema: EmaData = { ema20: 50.00, ema50: 52.00, ema200: 55.00 };
      
      const trendScore = ScoreCalculator.calculateTrendScore(price, ema);
      const trendAnalysis = ScoreCalculator.analyzeEMATrends(price, ema);
      
      expect(trendScore).toBe(0); // Penalized for being below EMA200
      expect(trendAnalysis.trendStrength).toBe('strong_bearish');
      expect(trendAnalysis.fundamentalConcerns).toContain('Stock trading below EMA200 - market may doubt fundamentals');
    });
  });

  describe('calculateRSIScore', () => {
    it('should return neutral score for missing RSI data', () => {
      const rsiData = { rsi: null, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(50);
    });

    it('should give perfect score for ideal RSI range (40-60)', () => {
      const rsiData = { rsi: 50, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(100);
    });

    it('should give high score for good RSI range (30-70)', () => {
      const rsiData = { rsi: 35, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(85);
      
      const rsiData2 = { rsi: 65, period: 14 };
      const result2 = ScoreCalculator.calculateRSIScore(rsiData2);
      expect(result2).toBe(85);
    });

    it('should give moderate score for acceptable range (20-80)', () => {
      const rsiData = { rsi: 25, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(70);
      
      const rsiData2 = { rsi: 75, period: 14 };
      const result2 = ScoreCalculator.calculateRSIScore(rsiData2);
      expect(result2).toBe(70);
    });

    it('should penalize overbought conditions (80-90)', () => {
      const rsiData = { rsi: 85, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(30);
    });

    it('should heavily penalize extreme overbought (>90)', () => {
      const rsiData = { rsi: 95, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(10);
    });

    it('should handle oversold as potential opportunity (<20)', () => {
      const rsiData = { rsi: 15, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(40);
    });

    it('should handle extreme oversold (<10)', () => {
      const rsiData = { rsi: 5, period: 14 };
      const result = ScoreCalculator.calculateRSIScore(rsiData);
      expect(result).toBe(20);
    });

    it('should clamp scores within 0-100 range', () => {
      const rsiData1 = { rsi: 0, period: 14 };
      const result1 = ScoreCalculator.calculateRSIScore(rsiData1);
      expect(result1).toBeGreaterThanOrEqual(0);
      expect(result1).toBeLessThanOrEqual(100);
      
      const rsiData2 = { rsi: 100, period: 14 };
      const result2 = ScoreCalculator.calculateRSIScore(rsiData2);
      expect(result2).toBeGreaterThanOrEqual(0);
      expect(result2).toBeLessThanOrEqual(100);
    });
  });
});
