import { supabase } from '../supabase/supabaseClient.js';
import { DividendAnalysis, DividendScores } from '../models/DividendAnalysis.js';
import { Quote, Fundamentals } from '../models/StockData.js';
import { createHash } from 'crypto';

export interface AnalysisOptions {
  requiredReturn?: number;
  periods?: number;
  minStreak?: number;
  [key: string]: any;
}

export interface TickerRecord {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  currency: string;
}

export interface AnalysisRecord {
  id: string;
  ticker_id: string;
  observed_at: string;
  options_hash: string;
  price: number;
  ttm_div: number | null;
  ttm_yield: number | null;
  forward_yield: number | null;
  cagr3: number | null;
  cagr5: number | null;
  safe_growth: number | null;
  streak: number | null;
  payout_eps: number | null;
  payout_fcf: number | null;
  fcf_coverage: number | null;
  ddm_price: number | null;
  score_payout: number | null;
  score_fcf: number | null;
  score_streak: number | null;
  score_growth: number | null;
  score_total: number | null;
  raw: any;
}

export class DatabaseService {
  static createOptionsHash(options: AnalysisOptions): string {
    const normalized = JSON.stringify(options, Object.keys(options).sort());
    return createHash('md5').update(normalized).digest('hex').substring(0, 16);
  }

  static async ensureTicker(symbol: string, name?: string, sector?: string): Promise<string> {
    // Try to get existing ticker
    const { data: existingTicker, error: selectError } = await supabase
      .from('tickers')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (existingTicker) {
      return existingTicker.id;
    }

    if (selectError && selectError.code !== 'PGRST116') { // Not "not found" error
      throw new Error(`Database error checking ticker: ${selectError.message}`);
    }

    // Insert new ticker
    const { data: newTicker, error: insertError } = await supabase
      .from('tickers')
      .insert({
        symbol: symbol.toUpperCase(),
        name: name || null,
        sector: sector || null
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create ticker: ${insertError.message}`);
    }

    return newTicker.id;
  }

  static async saveAnalysis(
    analysis: DividendAnalysis,
    options: AnalysisOptions = {}
  ): Promise<string> {
    try {
      // Ensure ticker exists
      const tickerId = await this.ensureTicker(
        analysis.ticker,
        analysis.quote.name,
        // We don't have sector in current analysis, could be added later
      );

      const optionsHash = this.createOptionsHash(options);

      // Prepare analysis record
      const record: Omit<AnalysisRecord, 'id'> = {
        ticker_id: tickerId,
        observed_at: new Date().toISOString(),
        options_hash: optionsHash,
        price: analysis.quote.price,
        ttm_div: isFinite(analysis.ttmDividends) ? analysis.ttmDividends : null,
        ttm_yield: analysis.ttmYield ?? null,
        forward_yield: analysis.forwardYield ?? null,
        cagr3: analysis.cagr3 ?? null,
        cagr5: analysis.cagr5 ?? null,
        safe_growth: analysis.safeGrowth,
        streak: analysis.streak,
        payout_eps: isFinite(analysis.fundamentals.epsPayoutRatio) ? analysis.fundamentals.epsPayoutRatio : null,
        payout_fcf: isFinite(analysis.fundamentals.fcfPayoutRatio) ? analysis.fundamentals.fcfPayoutRatio : null,
        fcf_coverage: isFinite(analysis.fundamentals.fcfCoverage) ? analysis.fundamentals.fcfCoverage : null,
        ddm_price: null, // Would need to add Gordon Growth Model result to analysis
        score_payout: Math.round(analysis.scores.payout),
        score_fcf: Math.round(analysis.scores.fcf),
        score_streak: Math.round(analysis.scores.streak),
        score_growth: Math.round(analysis.scores.growth),
        score_total: analysis.totalScore,
        raw: {
          analysis: {
            ticker: analysis.ticker,
            quote: analysis.quote,
            ttmDividends: analysis.ttmDividends,
            ttmYield: analysis.ttmYield,
            annualDividends: analysis.annualDividends,
            cagr3: analysis.cagr3,
            cagr5: analysis.cagr5,
            streak: analysis.streak,
            fundamentals: {
              operatingCashFlow: analysis.fundamentals.operatingCashFlow,
              capitalExpenditure: analysis.fundamentals.capitalExpenditure,
              cashDividendsPaid: analysis.fundamentals.cashDividendsPaid,
              netIncome: analysis.fundamentals.netIncome,
              payoutRatio: analysis.fundamentals.payoutRatio,
              freeCashFlow: analysis.fundamentals.freeCashFlow,
              fcfPayoutRatio: analysis.fundamentals.fcfPayoutRatio,
              fcfCoverage: analysis.fundamentals.fcfCoverage,
              epsPayoutRatio: analysis.fundamentals.epsPayoutRatio
            },
            safeGrowth: analysis.safeGrowth,
            forwardDividend: analysis.forwardDividend,
            forwardYield: analysis.forwardYield,
            scores: analysis.scores,
            totalScore: analysis.totalScore
          },
          options,
          savedAt: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('analyses')
        .insert(record)
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to save analysis: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Database save failed:', error);
      throw error;
    }
  }

  static async getRecentAnalysis(
    symbol: string,
    optionsHash: string,
    hoursThreshold: number = 24
  ): Promise<AnalysisRecord | null> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursThreshold);

    const { data, error } = await supabase
      .from('analyses')
      .select(`
        *,
        tickers!inner (symbol)
      `)
      .eq('tickers.symbol', symbol.toUpperCase())
      .eq('options_hash', optionsHash)
      .gte('observed_at', cutoffTime.toISOString())
      .order('observed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no record found, return null (not an error)
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get recent analysis: ${error.message}`);
    }

    return data;
  }

  static async getAnalysisHistory(
    symbol: string,
    limit: number = 30
  ): Promise<AnalysisRecord[]> {
    const { data, error } = await supabase
      .from('analyses')
      .select(`
        *,
        tickers!inner (symbol)
      `)
      .eq('tickers.symbol', symbol.toUpperCase())
      .order('observed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get analysis history: ${error.message}`);
    }

    return data || [];
  }

  static async getLeaderboard(date?: Date, limit: number = 50): Promise<any[]> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('leaderboard_daily')
      .select('*')
      .eq('as_of_date', dateStr)
      .order('rank')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get leaderboard: ${error.message}`);
    }

    return data || [];
  }

  static async refreshLeaderboard(): Promise<void> {
    const { error } = await supabase.rpc('refresh_leaderboard_daily');

    if (error) {
      throw new Error(`Failed to refresh leaderboard: ${error.message}`);
    }
  }

  static hydrateAnalysisFromRecord(record: AnalysisRecord): DividendAnalysis {
    // The raw field contains the full analysis data
    const rawAnalysis = record.raw.analysis;
    
    // Reconstruct the Quote object
    const quote = new Quote({
      regularMarketPrice: rawAnalysis.quote.price,
      currency: rawAnalysis.quote.currency,
      shortName: rawAnalysis.quote.name
    });

    // Reconstruct the Fundamentals object
    const fundamentals = new Fundamentals({
      OperatingCashFlow: { raw: rawAnalysis.fundamentals.operatingCashFlow },
      CapitalExpenditure: { raw: rawAnalysis.fundamentals.capitalExpenditure },
      CashDividendsPaid: { raw: rawAnalysis.fundamentals.cashDividendsPaid },
      NetIncome: { raw: rawAnalysis.fundamentals.netIncome },
      payoutRatio: { raw: rawAnalysis.fundamentals.payoutRatio }
    });

    // Reconstruct the DividendScores object
    const scores = new DividendScores({
      payout: rawAnalysis.scores.payout,
      fcf: rawAnalysis.scores.fcf,
      streak: rawAnalysis.scores.streak,
      growth: rawAnalysis.scores.growth
    });

    // Create and return the full DividendAnalysis
    return new DividendAnalysis({
      ticker: rawAnalysis.ticker,
      quote,
      ttmDividends: rawAnalysis.ttmDividends,
      ttmYield: rawAnalysis.ttmYield,
      annualDividends: rawAnalysis.annualDividends,
      cagr3: rawAnalysis.cagr3,
      cagr5: rawAnalysis.cagr5,
      streak: rawAnalysis.streak,
      fundamentals,
      safeGrowth: rawAnalysis.safeGrowth,
      forwardDividend: rawAnalysis.forwardDividend,
      forwardYield: rawAnalysis.forwardYield,
      scores,
      totalScore: rawAnalysis.totalScore
    });
  }
}