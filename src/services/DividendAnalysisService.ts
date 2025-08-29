import { YahooFinanceService } from "./YahooFinanceService.js";
import { AlphaVantageService } from "./AlphaVantageService.js";
import { DividendCalculator } from "../calculators/DividendCalculator.js";
import { ScoreCalculator } from "../calculators/ScoreCalculator.js";
import { DividendAnalysis, EmaData } from "../models/DividendAnalysis.js";
import { DividendEliteDetector } from "../data/DividendAristocrats.js";
import { calculateCAGR } from "../utils/MathUtils.js";
import { DatabaseService, type AnalysisOptions } from "./DatabaseService.js";
import { TechnicalIndicatorCalculator } from "../calculators/TechnicalIndicatorCalculator.js";

export class DividendAnalysisService {
  private readonly yahooService: YahooFinanceService;
  private readonly alphaVantageService: AlphaVantageService | null;

  constructor() {
    this.yahooService = new YahooFinanceService();
    
    // Initialize Alpha Vantage service if API key is available
    try {
      this.alphaVantageService = new AlphaVantageService();
    } catch (error) {
      console.warn('Alpha Vantage service not available:', error instanceof Error ? error.message : 'Unknown error');
      this.alphaVantageService = null;
    }
  }
  
  async healthCheck(): Promise<{ available: boolean; latency: number; error?: string }> {
    return this.yahooService.healthCheck();
  }

  async analyze(
    ticker: string, 
    years: number = 15, 
    requiredReturn: number = 0.09,
    saveToDb: boolean = true,
    forceFresh: boolean = false,
    provider: string = 'yahoo'
  ): Promise<DividendAnalysis> {
    // Create options hash for caching (include provider)
    const options: AnalysisOptions = {
      requiredReturn,
      years,
      periods: years,
      provider
    };
    const optionsHash = DatabaseService.createOptionsHash(options);

    // Check for recent cached analysis (within 24 hours) unless forced fresh
    if (saveToDb && !forceFresh) {
      try {
        const cachedRecord = await DatabaseService.getRecentAnalysis(ticker, optionsHash, 24);
        if (cachedRecord) {
          console.log(`📋 Using cached analysis for ${ticker} (${new Date(cachedRecord.observed_at).toLocaleString()})`);
          return DatabaseService.hydrateAnalysisFromRecord(cachedRecord);
        }
      } catch (error) {
        console.warn('Cache lookup failed, proceeding with fresh analysis:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    if (forceFresh) {
      console.log(`🔄 Force fresh analysis requested for ${ticker}, bypassing cache`);
    }

    // Perform fresh analysis
    console.log(`🔍 Performing fresh analysis for ${ticker}...`);
    
    // Get quote and enhance with Alpha Vantage data if requested
    let quote = await this.yahooService.getQuote(ticker);
    
    // Get company overview from Alpha Vantage if provider is 'av' and service is available
    let companyOverview = null;
    if (provider === 'av' && this.alphaVantageService) {
      try {
        companyOverview = await this.alphaVantageService.getCompanyOverview(ticker);
        console.log(`📊 Using Alpha Vantage company overview for ${ticker}`);
        
        // Create new enhanced quote with AV data if available
        if (companyOverview.Sector && companyOverview.Industry) {
          const { Quote } = await import("../models/StockData.js");
          quote = new Quote({
            regularMarketPrice: quote.price,
            currency: quote.currency,
            shortName: quote.name,
            sector: companyOverview.Sector,
            industry: companyOverview.Industry
          });
        }
      } catch (error) {
        console.warn(`⚠️  Alpha Vantage company overview failed, falling back to Yahoo Finance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const dividendEvents = await this.yahooService.getDividendEvents(ticker, years);
    const fundamentals = await this.yahooService.getFundamentals(ticker, years);

    const ttmDividends = DividendCalculator.calculateTTMDividends(dividendEvents);
    const ttmYield = quote.price ? ttmDividends / quote.price : null;

    const annualDividends = DividendCalculator.annualizeDividends(dividendEvents);
    const last3 = annualDividends.slice(-3);
    const last5 = annualDividends.slice(-5);
    
    const cagr3 = last3.length >= 3 ? calculateCAGR(last3) : null;
    const cagr5 = last5.length >= 5 ? calculateCAGR(last5) : null;
    
    // Calculate dividend streak with enhanced logic
    const rawStreak = DividendCalculator.calculateDividendStreak(annualDividends);
    
    // Validate against known dividend elite stocks
    const streakValidation = DividendEliteDetector.validateStreak(ticker, rawStreak);
    const { adjustedStreak, rationale } = DividendEliteDetector.getAdjustedStreak(ticker, rawStreak);
    
    // Use adjusted streak for analysis
    const streak = adjustedStreak;
    
    // Log data quality issues for known elite stocks
    if (streakValidation.warning && !process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      console.warn(`⚠️  Dividend Streak: ${streakValidation.warning}`);
      if (rationale) {
        console.warn(`🔧 Adjustment: ${rationale}`);
      }
    }

    const safeGrowth = DividendCalculator.calculateSafeGrowth(cagr5, cagr3, fundamentals, streak);
    const forwardDividend = isFinite(ttmDividends) ? ttmDividends * (1 + safeGrowth) : NaN;
    const forwardYield = quote.price ? forwardDividend / quote.price : null;

    let ema: EmaData = { ema20: null, ema50: null, ema200: null };
    if (this.alphaVantageService) {
      try {
        const timeSeries = await this.alphaVantageService.getTimeSeriesDaily(ticker, 'full');
        const closePrices = TechnicalIndicatorCalculator.extractClosePrices(timeSeries);
        const ema20 = TechnicalIndicatorCalculator.calculateEMA(closePrices, 20);
        const ema50 = TechnicalIndicatorCalculator.calculateEMA(closePrices, 50);
        const ema200 = TechnicalIndicatorCalculator.calculateEMA(closePrices, 200);
        ema = {
          ema20: ema20.length > 0 ? ema20[ema20.length - 1] : null,
          ema50: ema50.length > 0 ? ema50[ema50.length - 1] : null,
          ema200: ema200.length > 0 ? ema200[ema200.length - 1] : null,
        };
      } catch (error) {
        console.warn(`⚠️  Failed to calculate EMAs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const scores = ScoreCalculator.calculateDividendScores(fundamentals, streak, safeGrowth, quote, ema);
    const totalScore = ScoreCalculator.calculateTotalScore(scores);

    const analysis = new DividendAnalysis({
      ticker,
      quote,
      ttmDividends,
      ttmYield,
      annualDividends,
      cagr3,
      cagr5,
      streak,
      fundamentals,
      safeGrowth,
      forwardDividend,
      forwardYield,
      scores,
      totalScore,
      ema
    });

    // Save to database if requested
    if (saveToDb) {
      try {
        await DatabaseService.saveAnalysis(analysis, options);
        console.log(`💾 Analysis saved to database for ${ticker}`);
      } catch (error) {
        console.warn('Failed to save analysis to database:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw - analysis should still succeed even if DB save fails
      }
    }

    return analysis;
  }
}