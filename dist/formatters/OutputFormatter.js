export class OutputFormatter {
    static formatPercentage(value) {
        return value != null && isFinite(value) ? (value * 100).toFixed(2) + "%" : "—";
    }
    static formatNumber(value, digits = 2) {
        return value == null || !isFinite(value) ? "—" : value.toFixed(digits);
    }
    static formatDividendAnalysis(analysis, _requiredReturn) {
        const { ticker, quote, ttmDividends, ttmYield, cagr3, cagr5, streak, fundamentals, safeGrowth, forwardDividend, forwardYield, scores, totalScore } = analysis;
        console.log(`\n${quote.name} (${ticker}) — currency: ${quote.currency}`);
        console.log("──────────────────────────────────────────────────────────");
        console.log(`Price:                 ${this.formatNumber(quote.price)} ${quote.currency}`);
        console.log(`TTM Dividends:         ${this.formatNumber(ttmDividends)} (${this.formatPercentage(ttmYield)})`);
        console.log(`3y/5y Dividend CAGR:   ${cagr3 == null ? "—" : this.formatPercentage(cagr3)} / ${cagr5 == null ? "—" : this.formatPercentage(cagr5)}`);
        console.log(`Dividend streak:       ${streak} year(s)`);
        console.log(`EPS payout ratio:      ${!isFinite(fundamentals.epsPayoutRatio) ? "—" : this.formatPercentage(fundamentals.epsPayoutRatio)}`);
        console.log(`FCF payout ratio:      ${!isFinite(fundamentals.fcfPayoutRatio) ? "—" : this.formatPercentage(fundamentals.fcfPayoutRatio)}`);
        console.log(`FCF coverage:          ${!isFinite(fundamentals.fcfCoverage) ? "—" : this.formatNumber(fundamentals.fcfCoverage, 2)}x`);
        console.log(`Safe growth used:      ${this.formatPercentage(safeGrowth)}`);
        console.log(`Expected fwd yield:    ${this.formatPercentage(forwardYield)}  (from D1=${this.formatNumber(forwardDividend)})`);
        console.log(`\nDividend Potential Score: ${totalScore}/100`);
        console.log(`• Drivers → payout:${this.formatNumber(scores.payout, 0)} fcf:${this.formatNumber(scores.fcf, 0)} streak:${this.formatNumber(scores.streak, 0)} growth:${this.formatNumber(scores.growth, 0)}`);
    }
    static formatGordonGrowthModel(ddmPrice, currentPrice, requiredReturn, safeGrowth) {
        if (ddmPrice) {
            const ddmUpside = (ddmPrice - currentPrice) / currentPrice;
            console.log(`\n[DDM] r=${(requiredReturn * 100).toFixed(1)}% g=${this.formatPercentage(safeGrowth)}  ->  price*= ${this.formatNumber(ddmPrice)}  (${this.formatPercentage(ddmUpside)} vs current)`);
        }
    }
    static formatFooter() {
        console.log("\nNotes: This is an educational heuristic, not investment advice.");
    }
}
