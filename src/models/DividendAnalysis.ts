import type { Quote, Fundamentals } from './StockData.js';
import { MacdData, RsiData } from "../calculators/TechnicalIndicatorCalculator.js";

export type AnnualDividendData = [year: number, amount: number];

export interface DividendAnalysisParams {
  ticker: string;
  quote: Quote;
  ttmDividends: number;
  ttmYield: number | null;
  annualDividends: AnnualDividendData[];
  cagr3: number | null;
  cagr5: number | null;
  streak: number;
  fundamentals: Fundamentals;
  safeGrowth: number;
  forwardDividend: number;
  forwardYield: number | null;
  scores: DividendScores;
  totalScore: number;
  ema: EmaData;
  macd: MacdData;
  rsi: RsiData;
}

export class DividendAnalysis {
  public readonly ticker: string;
  public readonly quote: Quote;
  public readonly ttmDividends: number;
  public readonly ttmYield: number | null;
  public readonly annualDividends: AnnualDividendData[];
  public readonly cagr3: number | null;
  public readonly cagr5: number | null;
  public readonly streak: number;
  public readonly fundamentals: Fundamentals;
  public readonly safeGrowth: number;
  public readonly forwardDividend: number;
  public readonly forwardYield: number | null;
  public readonly scores: DividendScores;
  public readonly totalScore: number;
  public readonly ema: EmaData;
  public readonly macd: MacdData;
  public readonly rsi: RsiData;

  constructor({
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
    ema,
    macd,
    rsi
  }: DividendAnalysisParams) {
    this.ticker = ticker;
    this.quote = quote;
    this.ttmDividends = ttmDividends;
    this.ttmYield = ttmYield;
    this.annualDividends = annualDividends;
    this.cagr3 = cagr3;
    this.cagr5 = cagr5;
    this.streak = streak;
    this.fundamentals = fundamentals;
    this.safeGrowth = safeGrowth;
    this.forwardDividend = forwardDividend;
    this.forwardYield = forwardYield;
    this.scores = scores;
    this.totalScore = totalScore;
    this.ema = ema;
    this.macd = macd;
    this.rsi = rsi;
  }
}

export interface EmaData {
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
}

export interface DividendScoresParams {
  payout: number;
  fcf: number;
  streak: number;
  growth: number;
  trend: number;
  macd: number;
  rsi: number;
}

export class DividendScores {
  public readonly payout: number;
  public readonly fcf: number;
  public readonly streak: number;
  public readonly growth: number;
  public readonly trend: number;
  public readonly macd: number;
  public readonly rsi: number;

  constructor({ payout, fcf, streak, growth, trend, macd, rsi }: DividendScoresParams) {
    this.payout = payout;
    this.fcf = fcf;
    this.streak = streak;
    this.growth = growth;
    this.trend = trend;
    this.macd = macd;
    this.rsi = rsi;
  }
}