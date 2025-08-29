-- Enhanced schema for dividend analysis storage
-- Replaces basic schema with comprehensive analysis tracking

-- Drop existing tables if they conflict
DROP TABLE IF EXISTS dividend_analysis CASCADE;
DROP TABLE IF EXISTS dividend_history CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;

-- Core ticker reference table
CREATE TABLE tickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  name TEXT,
  sector TEXT,
  industry TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comprehensive analysis results table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ DEFAULT now(),
  options_hash TEXT NOT NULL,
  
  -- Price & dividend data
  price NUMERIC(10,4) NOT NULL,
  ttm_div NUMERIC(10,4),
  ttm_yield NUMERIC(8,6),
  forward_yield NUMERIC(8,6),
  
  -- Growth metrics
  cagr3 NUMERIC(8,6),
  cagr5 NUMERIC(8,6),
  safe_growth NUMERIC(8,6),
  
  -- Sustainability metrics
  streak INTEGER,
  payout_eps NUMERIC(8,6),
  payout_fcf NUMERIC(8,6),
  fcf_coverage NUMERIC(8,4),
  
  -- Valuation
  ddm_price NUMERIC(10,4),
  
  -- Individual scores (0-100)
  score_payout INTEGER,
  score_fcf INTEGER,
  score_streak INTEGER,
  score_growth INTEGER,
  score_total INTEGER,
  
  -- Full analysis data as JSON
  raw JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Core performance indexes
CREATE INDEX idx_analyses_ticker_observed ON analyses (ticker_id, observed_at DESC);
CREATE INDEX idx_analyses_options_hash ON analyses (options_hash);
CREATE INDEX idx_analyses_observed_at ON analyses (observed_at DESC);

-- Query-specific indexes
CREATE INDEX idx_analyses_score_total ON analyses (score_total DESC) WHERE score_total IS NOT NULL;
CREATE INDEX idx_analyses_forward_yield ON analyses (forward_yield DESC) WHERE forward_yield IS NOT NULL;

-- Create an immutable function for date truncation
CREATE OR REPLACE FUNCTION immutable_date_trunc(timestamp with time zone)
RETURNS date AS $$
  SELECT $1::date;
$$ LANGUAGE sql IMMUTABLE;

-- Prevent duplicate analyses on same day with same params
CREATE UNIQUE INDEX idx_analyses_daily_unique ON analyses (
  ticker_id, 
  options_hash, 
  immutable_date_trunc(observed_at)
);

-- Leaderboard materialized view
CREATE MATERIALIZED VIEW leaderboard_daily AS
SELECT 
  immutable_date_trunc(observed_at) as as_of_date,
  ticker_id,
  t.symbol,
  t.name,
  score_total as score,
  forward_yield,
  ROW_NUMBER() OVER (
    PARTITION BY immutable_date_trunc(observed_at) 
    ORDER BY score_total DESC, forward_yield DESC NULLS LAST
  ) as rank
FROM analyses a
JOIN tickers t ON t.id = a.ticker_id
WHERE score_total IS NOT NULL
  AND observed_at >= CURRENT_DATE - INTERVAL '30 days';

-- Leaderboard index
CREATE INDEX idx_leaderboard_date_rank ON leaderboard_daily (as_of_date DESC, rank);

-- Refresh function for leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard_daily()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_daily;
END;
$$ LANGUAGE plpgsql;