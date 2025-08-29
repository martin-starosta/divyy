export interface YahooQuoteResponse {
  regularMarketPrice?: number;
  postMarketPrice?: number;
  preMarketPrice?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
}

export interface YahooDividendEvent {
  date?: number;
  dateUTC?: string | Date;
  timestamp?: string | Date | number;
  amount?: number;
  divCash?: number;
  value?: number;
}

export interface YahooChartResponse {
  events?: {
    dividends?: Record<string, YahooDividendEvent>;
  } | YahooDividendEvent[];
}

export interface YahooFundamentalsData {
  OperatingCashFlow?: YahooFieldValue;
  CapitalExpenditure?: YahooFieldValue;
  CashDividendsPaid?: YahooFieldValue;
  NetIncome?: YahooFieldValue;
  payoutRatio?: YahooFieldValue;
}

export interface YahooFieldValue {
  raw?: number;
}

export interface YahooFundamentalsResponse {
  timeSeries?: YahooFundamentalsData[];
}

export interface YahooQuoteSummaryResponse {
  summaryDetail?: {
    payoutRatio?: YahooFieldValue;
  };
  defaultKeyStatistics?: {
    payoutRatio?: YahooFieldValue;
  };
  financialData?: Record<string, unknown>;
}

export interface YahooChartOptions {
  period1: Date;
  period2: Date;
  interval: string;
  events: string;
}

export interface YahooFundamentalsOptions {
  period1: Date;
  period2: Date;
  type: string;
  module: string;
}

export interface YahooQuoteSummaryOptions {
  modules: string[];
}