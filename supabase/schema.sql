CREATE TABLE stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT UNIQUE NOT NULL,
  name TEXT,
  exchange TEXT,
  sector TEXT,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dividends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE,
  ex_dividend_date DATE,
  payment_date DATE,
  record_date DATE,
  amount NUMERIC,
  frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_stocks (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE,
  quantity NUMERIC,
  purchase_price NUMERIC,
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, stock_id)
);
