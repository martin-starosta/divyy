export class DividendAnalysis {
  constructor({
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
  }) {
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
  }
}

export class DividendScores {
  constructor({ payout, fcf, streak, growth }) {
    this.payout = payout;
    this.fcf = fcf;
    this.streak = streak;
    this.growth = growth;
  }
}