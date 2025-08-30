import type { DividendAnalysis } from '../models/DividendAnalysis.js';
import { DividendEliteDetector } from '../data/DividendAristocrats.js';
import { TechnicalIndicatorCalculator } from '../calculators/TechnicalIndicatorCalculator.js';

export class OutputFormatter {
  static formatPercentage(value: number | null): string {
    return value != null && isFinite(value) ? (value * 100).toFixed(2) + "%" : "—";
  }

  static formatNumber(value: number | null, digits: number = 2): string {
    return value == null || !isFinite(value) ? "—" : value.toFixed(digits);
  }

  static formatDividendAnalysis(analysis: DividendAnalysis, _requiredReturn: number): void {
    const { ticker, quote, ttmDividends, ttmYield, cagr3, cagr5, streak, fundamentals, 
            safeGrowth, forwardDividend, forwardYield, scores, totalScore } = analysis;
    
    console.log(`\n${quote.name} (${ticker}) — currency: ${quote.currency}`);
    console.log("──────────────────────────────────────────────────────────");
    console.log(`Price:                 ${this.formatNumber(quote.price)} ${quote.currency}`);
    console.log(`TTM Dividends:         ${this.formatNumber(ttmDividends)} (${this.formatPercentage(ttmYield)})`);
    console.log(`3y/5y Dividend CAGR:   ${cagr3 == null ? "—" : this.formatPercentage(cagr3)} / ${cagr5 == null ? "—" : this.formatPercentage(cagr5)}`);
    // Enhanced dividend streak display with elite status
    const eliteStock = DividendEliteDetector.isKnownElite(ticker);
    let streakDisplay = `${streak} year(s)`;
    
    if (eliteStock) {
      const badge = eliteStock.category === 'king' ? '👑 King' : '🏆 Aristocrat';
      streakDisplay = `${streak} year(s) ${badge}`;
    }
    
    console.log(`Dividend streak:       ${streakDisplay}`);
    console.log(`EPS payout ratio:      ${!isFinite(fundamentals.epsPayoutRatio) ? "—" : this.formatPercentage(fundamentals.epsPayoutRatio)}`);
    console.log(`FCF payout ratio:      ${!isFinite(fundamentals.fcfPayoutRatio) ? "—" : this.formatPercentage(fundamentals.fcfPayoutRatio)}`);
    console.log(`FCF coverage:          ${!isFinite(fundamentals.fcfCoverage) ? "—" : this.formatNumber(fundamentals.fcfCoverage, 2)}x`);
    console.log(`Safe growth used:      ${this.formatPercentage(safeGrowth)}`);
    console.log(`Expected fwd yield:    ${this.formatPercentage(forwardYield)}  (from D1=${this.formatNumber(forwardDividend)})`);
    
    // Add technical indicators if available
    const hasEMA = analysis.ema && (analysis.ema.ema20 || analysis.ema.ema50 || analysis.ema.ema200);
    const hasMACD = analysis.macd && (analysis.macd.macdLine !== null || analysis.macd.signalLine !== null);
    
    if (hasEMA || hasMACD) {
      console.log(`\nTechnical Indicators:`);
      
      // EMA indicators
      if (hasEMA) {
        if (analysis.ema.ema200) {
          const ema200Status = quote.price > analysis.ema.ema200 ? 'ABOVE' : 'BELOW';
          console.log(`• EMA200: ${this.formatNumber(analysis.ema.ema200)} (${ema200Status})`);
        }
        if (analysis.ema.ema50) {
          const ema50Status = quote.price > analysis.ema.ema50 ? 'ABOVE' : 'BELOW';
          console.log(`• EMA50:  ${this.formatNumber(analysis.ema.ema50)} (${ema50Status})`);
        }
        if (analysis.ema.ema20) {
          const ema20Status = quote.price > analysis.ema.ema20 ? 'ABOVE' : 'BELOW';
          console.log(`• EMA20:  ${this.formatNumber(analysis.ema.ema20)} (${ema20Status})`);
        }
      }
      
      // MACD indicators
      if (hasMACD) {
        const macdAnalysis = TechnicalIndicatorCalculator.analyzeMACD(analysis.macd);
        const signalIcon = macdAnalysis.signal === 'bullish' ? '📈' : 
                          macdAnalysis.signal === 'bearish' ? '📉' : '➡️';
        
        console.log(`• MACD:   ${signalIcon} ${macdAnalysis.signal.toUpperCase()} (${macdAnalysis.strength})`);
        
        if (analysis.macd.macdLine !== null && analysis.macd.signalLine !== null) {
          console.log(`  - MACD Line: ${this.formatNumber(analysis.macd.macdLine, 4)}`);
          console.log(`  - Signal:    ${this.formatNumber(analysis.macd.signalLine, 4)}`);
        }
        
        if (analysis.macd.histogram !== null) {
          const histogramIcon = analysis.macd.histogram > 0 ? '⬆️' : 
                               analysis.macd.histogram < 0 ? '⬇️' : '➡️';
          console.log(`  - Histogram: ${this.formatNumber(analysis.macd.histogram, 4)} ${histogramIcon}`);
        }
        
        if (macdAnalysis.crossover !== 'none') {
          const crossIcon = macdAnalysis.crossover === 'bullish_crossover' ? '🚀' : '⚠️';
          console.log(`  - ${crossIcon} ${macdAnalysis.crossover.replace('_', ' ').toUpperCase()}`);
        }
      }
    }
    
    console.log(`\nDividend Potential Score: ${totalScore}/100`);
    console.log(`• Drivers → payout:${this.formatNumber(scores.payout, 0)} fcf:${this.formatNumber(scores.fcf, 0)} streak:${this.formatNumber(scores.streak, 0)} growth:${this.formatNumber(scores.growth, 0)} trend:${this.formatNumber(scores.trend, 0)} macd:${this.formatNumber(scores.macd, 0)}`);
  }

  static formatGordonGrowthModel(ddmPrice: number | null, currentPrice: number, requiredReturn: number, safeGrowth: number): void {
    if (ddmPrice) {
      const ddmUpside = (ddmPrice - currentPrice) / currentPrice;
      console.log(`\n[DDM] r=${(requiredReturn * 100).toFixed(1)}% g=${this.formatPercentage(safeGrowth)}  ->  price*= ${this.formatNumber(ddmPrice)}  (${this.formatPercentage(ddmUpside)} vs current)`);
    }
  }

  static formatFooter(): void {
    console.log("\nNotes: This is an educational heuristic, not investment advice.");
  }
}