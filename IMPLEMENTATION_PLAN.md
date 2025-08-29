# Divvy - Dividend Yield Potential CLI

## Project Overview
A Node.js CLI tool that analyzes dividend yield potential for stocks using free data sources. Given a ticker symbol, it returns a comprehensive dividend analysis with a transparent, rules-based scoring model.

## MVP Features

### Core Functionality
- **Command**: `divvy <TICKER>`
- **Data Sources**: 
  - Primary: yahoo-finance2 (no API key required)
  - Optional: Alpha Vantage fallback (with API key)
- **Key Metrics**:
  - Trailing 12-month dividend & yield
  - 3y/5y dividend CAGR
  - Dividend streak (years without cuts)
  - EPS and FCF payout ratios
  - Expected forward yield projection
  - Dividend Potential Score (0-100)

### Scoring Algorithm (Transparent & Rules-Based)

#### Data Collection
1. **Price & Quote Data**: Current price, currency, company name
2. **Dividend History**: 15 years of dividend events via chart module
3. **Financial Statements**: Cash flow and income statements via quoteSummary

#### Core Metrics Calculation
- **TTM Dividends**: Sum of last 365 days of dividend payments
- **TTM Yield**: TTM dividends / current price
- **Dividend CAGR**: 3-year and 5-year compound annual growth rates
- **Dividend Streak**: Consecutive years without year-over-year cuts
- **EPS Payout Ratio**: Dividends / net income (last fiscal year)
- **FCF Metrics**: 
  - FCF Payout Ratio: Dividends / (Operating Cash Flow - CapEx)
  - FCF Coverage: Free Cash Flow / Dividends

#### Forward Yield Projection
1. Start with 5-year CAGR (fallback to 3-year, then 0%)
2. Clamp growth to [-10%, +15%] range
3. Apply safety constraints:
   - If EPS payout > 80% → cap growth ≤ 0%
   - If FCF payout > 100% → cap growth ≤ 0%  
   - If dividend streak < 3 years → cap growth ≤ 0%
4. Expected forward yield = (TTM × (1 + safe_growth)) / price

#### Dividend Potential Score (0-100)
Weighted scoring model:
- **30% Payout Health**: EPS payout ratio (≤60% = 100 points, linear decay to 0 at 100%)
- **30% FCF Coverage**: Free cash flow coverage (2x+ = 100 points, linear to 0)
- **20% Streak Length**: Dividend consistency (20+ years = 100 points)
- **20% Dividend Growth**: Growth rate (-10% = 0 points, 0% = 50 points, +10% = 100 points)

### Optional Features
- **DDM Valuation**: Simple Gordon Growth Model for price justification
- **Configurable Parameters**: Years of history, required return rate

## Technical Implementation

### Project Structure
```
divyy/
├── package.json          # Dependencies and CLI configuration
├── index.js             # Main CLI application
├── IMPLEMENTATION_PLAN.md # This file
└── README.md            # Usage instructions (future)
```

### Dependencies
- **commander**: CLI argument parsing
- **yahoo-finance2**: Financial data fetching (primary source)

### CLI Options
```bash
divvy <TICKER>                    # Basic usage
divvy <TICKER> --years 20         # Custom history period
divvy <TICKER> --r 0.10           # Custom required return for DDM
```

## Development Roadmap

### Phase 1: MVP Implementation ✓
- [x] Basic CLI structure with commander
- [x] Yahoo Finance integration for data fetching
- [x] Dividend history analysis and metrics
- [x] Financial statement parsing
- [x] Scoring algorithm implementation
- [x] Forward yield projection
- [x] Optional DDM valuation

### Phase 2: Enhanced Features ✓
- [ ] Alpha Vantage fallback integration
- [x] Better error handling and data validation
- [x] Output formatting improvements  
- [ ] Configuration file support
- [ ] Multiple ticker batch processing

### Phase 3: Advanced Analytics (Future)
- [ ] Machine Learning Integration:
  - XGBoost classifier for dividend cut prediction
  - Genetic Algorithm for hyperparameter optimization
  - Sliding-window feature engineering
- [ ] Enhanced Valuation Models:
  - Multi-stage DDM
  - Relative valuation metrics
- [ ] Risk Assessment:
  - Volatility analysis
  - Sector comparisons
  - Economic cycle considerations

## Data Sources

### Primary: yahoo-finance2
- **Advantages**: No API key, comprehensive data, active community
- **Modules Used**:
  - `chart()`: Price history and dividend events
  - `quoteSummary()`: Financial statements and fundamentals
  - `quote()`: Current price and basic info
- **Limitations**: Unofficial API, rate limiting possible

### Fallback: Alpha Vantage
- **API Endpoint**: TIME_SERIES_DAILY_ADJUSTED
- **Advantages**: Official API, reliable
- **Requirements**: Free API key (500 requests/day)
- **Usage**: Secondary data source when yahoo-finance2 fails

## Usage Examples

```bash
# Basic dividend analysis
divvy AAPL

# Extended historical analysis
divvy KO --years 20

# Custom required return for DDM
divvy T --r 0.12

# Example output:
# Apple Inc. (AAPL) — currency: USD
# ──────────────────────────────────────────────────────────
# Price:                 150.00 USD
# TTM Dividends:         0.92 (0.61%)
# 3y/5y Dividend CAGR:   7.50% / 8.20%
# Dividend streak:       12 year(s)
# EPS payout ratio:      15.20%
# FCF payout ratio:      18.50%
# FCF coverage:          5.41x
# Safe growth used:      7.50%
# Expected fwd yield:    0.66%  (from D1=0.99)
#
# Dividend Potential Score: 85/100
# • Drivers → payout:100 fcf:100 streak:60 growth:87
```

## Installation & Setup

```bash
# Initialize project
npm init -y

# Install dependencies  
npm install commander yahoo-finance2

# Make executable
chmod +x index.js

# Global installation (optional)
npm link

# Usage
node index.js MSFT
# or with global install:
divvy MSFT
```

## Key Design Principles

1. **Transparency**: All scoring logic is explainable and adjustable
2. **Free Access**: No paid API keys required for basic functionality
3. **Educational Focus**: Designed for learning and hypothesis testing
4. **Extensibility**: Architecture supports future ML enhancements
5. **Defensive**: Conservative assumptions in growth projections
6. **Practical**: Real-world applicable with clear limitations

## Disclaimers

- Educational tool for learning dividend analysis
- Not investment advice
- Data accuracy depends on third-party sources
- Historical performance doesn't guarantee future results
- Consider multiple factors beyond dividend metrics for investment decisions