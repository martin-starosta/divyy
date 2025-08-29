#!/usr/bin/env node
import { Command } from "commander";
import yahooFinance from "yahoo-finance2";

const program = new Command();
program
  .name("divvy")
  .description("Estimate dividend yield potential for a stock (free data).")
  .argument("<ticker>", "Stock ticker symbol, e.g. AAPL")
  .option("-y, --years <n>", "Years of dividend history to fetch", "15")
  .option("--r <pct>", "Required return for optional DDM output (e.g. 0.09)", "0.09")
  .parse(process.argv);

const opts = program.opts();
const TICKER = program.args[0].toUpperCase();
const YEARS = Math.max(3, parseInt(opts.years, 10) || 15);
const REQUIRED_RETURN = Math.max(0.01, Math.min(0.25, parseFloat(opts.r) || 0.09)); // 1%..25%

// Note: Configuration removed due to API changes

// ---------- util helpers ----------
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const pct = (x) => (isFinite(x) ? (x * 100).toFixed(2) + "%" : "—");
const fmt = (x, digits = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(digits));
const byYear = (d) => new Date(d).getUTCFullYear();

function sum(arr) { return arr.reduce((a, b) => a + (b || 0), 0); }

function annualizeDividends(divEvents) {
  const map = new Map();
  for (const ev of divEvents) {
    const y = byYear(ev.date || ev.dateUTC || ev.timestamp || ev);
    const amt = Number(ev.amount ?? ev.divCash ?? ev.value ?? 0);
    if (!isFinite(amt)) continue;
    map.set(y, (map.get(y) || 0) + amt);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]); // [ [year, total], ... ]
}

function CAGR(series) {
  // series: [ [year, value], ... ], assume last-first >= 3 years
  const vals = series.filter(([, v]) => v > 0);
  if (vals.length < 2) return null;
  const first = vals[0], last = vals[vals.length - 1];
  const years = (last[0] - first[0]) || 1;
  if (years < 2 || first[1] <= 0) return null;
  return Math.pow(last[1] / first[1], 1 / years) - 1;
}

function dividendStreak(series) {
  // Count consecutive non-decreasing years from latest backwards
  const s = series.slice().sort((a, b) => a[0] - b[0]);
  let streak = 0;
  for (let i = s.length - 1; i > 0; i--) {
    const cur = s[i][1], prev = s[i - 1][1];
    if (cur >= prev * 0.999) streak++;
    else break;
  }
  return streak;
}

function scoreFromPayout(payout) {
  if (!isFinite(payout) || payout <= 0) return 100;
  // <=60% best; 60–100% linear down to 0
  if (payout <= 0.6) return 100;
  if (payout >= 1.0) return 0;
  return (1 - (payout - 0.6) / 0.4) * 100;
}

function scoreFromFCFCoverage(coverage) {
  if (!isFinite(coverage)) return 0;
  if (coverage >= 2) return 100;
  if (coverage <= 0) return 0;
  return clamp(coverage / 2, 0, 1) * 100;
}

function scoreFromStreak(streak) {
  return clamp(streak / 20, 0, 1) * 100;
}

function scoreFromGrowth(g) {
  // map -10% -> 0, 0% -> 50, +10% -> 100 linearly
  const x = clamp((g - (-0.10)) / (0.10 - (-0.10)), 0, 1);
  return x * 100;
}

(async () => {
  try {
    // 1) Quote for price & name
    const quote = await yahooFinance.quote(TICKER);
    if (!quote) throw new Error("No quote returned");
    const price = quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice;
    const currency = quote.currency || "USD";
    const shortName = quote.shortName || quote.longName || TICKER;

    // 2) Dividend events (15y by default)
    // yahoo-finance2 chart() returns price history and events incl. dividends
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - YEARS);
    
    const chart = await yahooFinance.chart(TICKER, {
      period1: startDate,
      period2: endDate,
      interval: "1mo",
      events: "dividends"
    });

    const divs = (chart?.events?.dividends) ? Object.values(chart.events.dividends) :
                 (Array.isArray(chart?.events) ? chart.events : []);
    const divEvents = (divs || []).map(d => {
      let date;
      if (d.date) {
        // Date is already a timestamp in seconds, convert to milliseconds
        date = new Date(d.date * 1000);
      } else if (d.dateUTC) {
        date = new Date(d.dateUTC);
      } else if (d.timestamp) {
        date = new Date(d.timestamp);
      } else {
        date = new Date();
      }
      
      const amount = Number(d.amount ?? d.divCash ?? d.value ?? 0);
      return { date, amount };
    }).filter(d => isFinite(d.amount) && d.amount > 0 && d.date.getFullYear() > 1990 && d.date.getFullYear() < 2030);

    const now = Date.now();
    const ttmDiv = sum(divEvents.filter(d => (now - d.date.getTime()) <= 365 * 24 * 3600 * 1000).map(d => d.amount));
    const ttmYield = price ? ttmDiv / price : null;

    const annual = annualizeDividends(divEvents);
    // at least 3 annual points for CAGRs
    const last3 = annual.slice(-3);
    const last5 = annual.slice(-5);
    const cagr3 = last3.length >= 3 ? CAGR(last3) : null;
    const cagr5 = last5.length >= 5 ? CAGR(last5) : null;
    const streak = dividendStreak(annual);

    // 3) Fundamentals (cash flow & income)
    let ocf = NaN, capex = NaN, divPaid = NaN, netIncome = NaN, epsPayout = NaN;
    
    try {
      // Try fundamentalsTimeSeries first
      const fundamentals = await yahooFinance.fundamentalsTimeSeries(TICKER, {
        period1: startDate,
        period2: endDate,
        type: "annual",
        module: "all"
      });
      
      if (fundamentals && fundamentals.timeSeries) {
        const latest = fundamentals.timeSeries[0];
        if (latest) {
          ocf = Number(latest.OperatingCashFlow?.raw ?? latest.OperatingCashFlow ?? NaN);
          capex = Math.abs(Number(latest.CapitalExpenditure?.raw ?? latest.CapitalExpenditure ?? NaN));
          divPaid = Math.abs(Number(latest.CashDividendsPaid?.raw ?? latest.CashDividendsPaid ?? NaN));
          netIncome = Number(latest.NetIncome?.raw ?? latest.NetIncome ?? NaN);
        }
      }
    } catch (fundamentalsError) {
      console.error("Fundamentals API failed, trying quoteSummary...");
    }
    
    // Fallback to quoteSummary for basic ratios
    try {
      const qs = await yahooFinance.quoteSummary(TICKER, {
        modules: [
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData"
        ]
      });
      
      // Try to get EPS payout ratio from summary data
      if (isNaN(epsPayout)) {
        epsPayout = qs?.summaryDetail?.payoutRatio?.raw ?? qs?.defaultKeyStatistics?.payoutRatio?.raw ?? NaN;
      }
    } catch (summaryError) {
      console.error("QuoteSummary also failed");
    }

    const fcf = (isFinite(ocf) && isFinite(capex)) ? (ocf - capex) : NaN;
    const fcfPayout = (isFinite(divPaid) && isFinite(fcf) && fcf !== 0) ? divPaid / fcf : NaN;
    const fcfCoverage = (isFinite(divPaid) && isFinite(fcf) && divPaid > 0) ? fcf / divPaid : (divPaid === 0 ? Infinity : NaN);

    // Calculate EPS payout from fundamentals if not available from summary
    if (isNaN(epsPayout) && isFinite(divPaid) && isFinite(netIncome) && netIncome !== 0) {
      epsPayout = divPaid / Math.abs(netIncome);
    }

    // 4) Forward yield projection
    const growthBase = (cagr5 ?? cagr3 ?? 0);
    let safeGrowth = clamp(growthBase, -0.10, 0.15);
    if ((isFinite(epsPayout) && epsPayout > 0.8) ||
        (isFinite(fcfPayout) && fcfPayout > 1.0) ||
        streak < 3) {
      safeGrowth = Math.min(safeGrowth, 0);
    }
    const forwardDiv = isFinite(ttmDiv) ? ttmDiv * (1 + safeGrowth) : NaN;
    const forwardYield = price ? forwardDiv / price : NaN;

    // 5) Scoring
    const sPayout = scoreFromPayout(epsPayout);
    const sFCF = scoreFromFCFCoverage(fcfCoverage);
    const sStreak = scoreFromStreak(streak);
    const sGrowth = scoreFromGrowth(safeGrowth);
    const score = Math.round(
      0.30 * sPayout +
      0.30 * sFCF +
      0.20 * sStreak +
      0.20 * sGrowth
    );

    // Optional: simple DDM (Gordon) signal (for learning)
    // Price_justified = D1 / (r - g)  -> implied upside/downside vs current price
    let ddmPrice = null;
    if (price && isFinite(forwardDiv)) {
      const g = Math.max(-0.05, Math.min(0.06, safeGrowth)); // conservative bounds in DDM
      if (REQUIRED_RETURN > g) {
        ddmPrice = forwardDiv / (REQUIRED_RETURN - g);
      }
    }

    // 6) Print
    console.log(`\n${shortName} (${TICKER}) — currency: ${currency}`);
    console.log("──────────────────────────────────────────────────────────");
    console.log(`Price:                 ${fmt(price)} ${currency}`);
    console.log(`TTM Dividends:         ${fmt(ttmDiv)} (${pct(ttmYield)})`);
    console.log(`3y/5y Dividend CAGR:   ${cagr3 == null ? "—" : pct(cagr3)} / ${cagr5 == null ? "—" : pct(cagr5)}`);
    console.log(`Dividend streak:       ${streak} year(s)`);
    console.log(`EPS payout ratio:      ${epsPayout == null ? "—" : pct(epsPayout)}`);
    console.log(`FCF payout ratio:      ${fcfPayout == null ? "—" : pct(fcfPayout)}`);
    console.log(`FCF coverage:          ${!isFinite(fcfCoverage) ? "—" : fmt(fcfCoverage, 2)}x`);
    console.log(`Safe growth used:      ${pct(safeGrowth)}`);
    console.log(`Expected fwd yield:    ${pct(forwardYield)}  (from D1=${fmt(forwardDiv)})`);
    console.log(`\nDividend Potential Score: ${score}/100`);
    console.log(`• Drivers → payout:${fmt(sPayout,0)} fcf:${fmt(sFCF,0)} streak:${fmt(sStreak,0)} growth:${fmt(sGrowth,0)}`);

    if (ddmPrice) {
      const ddmUpside = ((ddmPrice - price) / price);
      console.log(`\n[DDM] r=${(REQUIRED_RETURN*100).toFixed(1)}% g=${pct(safeGrowth)}  ->  price*= ${fmt(ddmPrice)}  (${pct(ddmUpside)} vs current)`);
    }

    console.log("\nNotes: This is an educational heuristic, not investment advice.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();