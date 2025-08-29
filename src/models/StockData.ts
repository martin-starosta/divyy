import type { YahooQuoteResponse, YahooFundamentalsData, YahooFieldValue } from '../types/yahoo-finance.js';

export class Quote {
  public readonly price: number;
  public readonly currency: string;
  public readonly name: string;

  constructor({ regularMarketPrice, postMarketPrice, preMarketPrice, currency, shortName, longName }: YahooQuoteResponse) {
    this.price = regularMarketPrice || postMarketPrice || preMarketPrice || 0;
    this.currency = currency || "USD";
    this.name = shortName || longName || "";
  }
}

export class DividendEvent {
  public readonly date: Date;
  public readonly amount: number;

  constructor({ date, amount }: { date: number | string | Date; amount: number }) {
    this.date = new Date(typeof date === 'number' ? date * 1000 : date);
    this.amount = Number(amount);
  }

  get year(): number {
    return this.date.getUTCFullYear();
  }

  isValid(): boolean {
    return (
      this.amount > 0 && 
      isFinite(this.amount) && 
      this.year > 1990 && 
      this.year < 2030
    );
  }
}

export class Fundamentals {
  public readonly operatingCashFlow: number;
  public readonly capitalExpenditure: number;
  public readonly cashDividendsPaid: number;
  public readonly netIncome: number;
  public readonly payoutRatio: number;

  constructor(data: YahooFundamentalsData = {}) {
    this.operatingCashFlow = this.extractValue(data.OperatingCashFlow);
    this.capitalExpenditure = Math.abs(this.extractValue(data.CapitalExpenditure));
    this.cashDividendsPaid = Math.abs(this.extractValue(data.CashDividendsPaid));
    this.netIncome = this.extractValue(data.NetIncome);
    this.payoutRatio = this.extractValue(data.payoutRatio);
  }

  private extractValue(field?: YahooFieldValue | number): number {
    if (!field) return NaN;
    if (typeof field === 'number') return field;
    return Number(field.raw ?? field);
  }

  get freeCashFlow(): number {
    return isFinite(this.operatingCashFlow) && isFinite(this.capitalExpenditure) 
      ? this.operatingCashFlow - this.capitalExpenditure 
      : NaN;
  }

  get fcfPayoutRatio(): number {
    const fcf = this.freeCashFlow;
    return isFinite(this.cashDividendsPaid) && isFinite(fcf) && fcf !== 0 
      ? this.cashDividendsPaid / fcf 
      : NaN;
  }

  get fcfCoverage(): number {
    const fcf = this.freeCashFlow;
    return isFinite(this.cashDividendsPaid) && isFinite(fcf) && this.cashDividendsPaid > 0 
      ? fcf / this.cashDividendsPaid 
      : (this.cashDividendsPaid === 0 ? Infinity : NaN);
  }

  get epsPayoutRatio(): number {
    if (isFinite(this.payoutRatio)) return this.payoutRatio;
    
    if (isFinite(this.cashDividendsPaid) && isFinite(this.netIncome) && this.netIncome !== 0) {
      return this.cashDividendsPaid / Math.abs(this.netIncome);
    }
    
    return NaN;
  }
}