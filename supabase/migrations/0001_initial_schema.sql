CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_symbol TEXT UNIQUE NOT NULL,
  company_name TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dividend_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  ex_dividend_date DATE,
  payment_date DATE,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dividend_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  dividend_yield NUMERIC,
  payout_ratio NUMERIC,
  dividend_growth_rate NUMERIC,
  score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);