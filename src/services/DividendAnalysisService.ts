import { YahooFinanceService } from "./YahooFinanceService.js";
import { DividendCalculator } from "../calculators/DividendCalculator.js";
import { ScoreCalculator } from "../calculators/ScoreCalculator.js";
import { DividendAnalysis } from "../models/DividendAnalysis.js";
import { DividendEliteDetector } from "../data/DividendAristocrats.js";
import { calculateCAGR } from "../utils/MathUtils.js";

export class DividendAnalysisService {
  private readonly yahooService: YahooFinanceService;

  constructor() {
    this.yahooService = new YahooFinanceService();
  }
  
  async healthCheck(): Promise<{ available: boolean; latency: number; error?: string }> {
    return this.yahooService.healthCheck();
  }

  async analyze(ticker: string, years: number = 15, _requiredReturn: number = 0.09): Promise<DividendAnalysis> {
    const quote = await this.yahooService.getQuote(ticker);
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

    const scores = ScoreCalculator.calculateDividendScores(fundamentals, streak, safeGrowth);
    const totalScore = ScoreCalculator.calculateTotalScore(scores);

    return new DividendAnalysis({
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
      totalScore
    });
  }
}