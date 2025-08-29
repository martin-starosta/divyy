# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Divvy is a TypeScript CLI tool that analyzes dividend sustainability for public stocks. It fetches financial data from Yahoo Finance, calculates dividend health scores, and stores results in a Supabase PostgreSQL database with intelligent 24-hour caching.

## Development Commands

### Core Development
- `npm run dev -- <TICKER>` - Run analysis in development mode (uses tsx)
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run type-check` - Type check without compilation
- `npm start` - Run compiled version from dist/

### Database & Testing  
- `npm run test-db` - Test Supabase database connection
- `npm run test-cache` - Test 24-hour caching functionality 
- `npm run refresh-leaderboard` - Update materialized view for rankings

### CLI Usage Examples
- `divvy AAPL` - Analyze Apple with database save (default)
- `divvy MSFT --no-save` - Analyze without saving to database
- `divvy TSLA --force-fresh` - Force fresh analysis, bypass cache
- `divvy JNJ --verbose` - Show detailed data quality information

## Architecture Overview

### Data Flow Architecture
The application follows a layered architecture with intelligent caching:

1. **CLI Layer** (`DivvyCliApp`) - Argument parsing and user interface
2. **Service Layer** (`DividendAnalysisService`) - Main business logic with 24h cache checking
3. **Data Layer** (`YahooFinanceService`, `DatabaseService`) - External APIs and persistence  
4. **Calculation Layer** (`DividendCalculator`, `ScoreCalculator`) - Financial computations
5. **Model Layer** (`DividendAnalysis`, `StockData`) - Type-safe data structures

### Intelligent Caching System
The caching system automatically:
- Checks database for recent analysis (< 24 hours) with same parameters
- Returns cached results if found, avoiding expensive API calls
- Performs fresh analysis only when cache is stale or missing
- Uses MD5 hash of analysis options for cache key uniqueness

### Scoring Algorithm
Dividend sustainability is scored (0-100) across four dimensions:
- **Payout Score (30%)** - EPS payout ratio sustainability 
- **FCF Score (30%)** - Free cash flow coverage with fallback logic
- **Streak Score (20%)** - Years of consecutive dividend growth/maintenance
- **Growth Score (20%)** - Safe dividend growth rate projection

**FCF Fallback Logic**: If FCF data is missing but EPS payout ratio ≤ 60%, assigns partial credit (score = 50) instead of zero.

### Database Schema
- `tickers` - Master ticker reference with metadata
- `analyses` - Comprehensive analysis results with JSONB raw data
- `leaderboard_daily` - Materialized view for daily rankings
- Unique constraint prevents duplicate daily analyses with same parameters
- Custom immutable PostgreSQL function `immutable_date_trunc()` for indexing

## Key Implementation Details

### Environment Setup
Requires `.env` file with Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Database Initialization
Run SQL from `schema-setup.sql` in Supabase Dashboard SQL Editor to create tables, indexes, and materialized views.

### Node.js Compatibility
Currently requires Node.js 20.10+ due to yahoo-finance2 library using `import ... with { type: "json" }` syntax. Earlier versions may encounter syntax errors.

### Error Handling Strategy
- Analysis succeeds even if database operations fail (warns but continues)
- Graceful fallback when financial data is incomplete
- Validation errors use specific exit codes (2=invalid input, 3=permanent failure)

### Elite Stock Detection
`DividendAristocrats.ts` contains curated list of known dividend elite stocks with manual streak adjustments to handle data quality issues from Yahoo Finance API.

## File Organization

### Core Business Logic
- `services/DividendAnalysisService.ts` - Main analysis orchestration with caching
- `services/DatabaseService.ts` - Supabase operations and cache management
- `calculators/ScoreCalculator.ts` - Dividend sustainability scoring with FCF fallback
- `calculators/DividendCalculator.ts` - Financial calculations and streak detection

### Data Models
- `models/DividendAnalysis.ts` - Complete analysis result structure
- `models/StockData.ts` - Yahoo Finance data wrappers with computed properties

### Infrastructure
- `cli/DivvyCliApp.ts` - Commander.js CLI interface
- `formatters/OutputFormatter.ts` - Console output formatting
- `validation/InputValidator.ts` - Input sanitization and validation

The codebase prioritizes data accuracy, graceful degradation, and performance through intelligent caching while maintaining type safety throughout the TypeScript stack.

#Agent Operating Rules (Do/Don’t)

##Do
- Enforce the schema and contracts above.
- Prefer simple, pure, testable functions.
- Fail soft with user-facing warnings.
- Add migration scripts with every DB change.
- Write brief JSDoc for each exported function.

##Don’t
- Add paid dependencies or data vendors.
- Hardcode secrets or project-specific IDs.
- Break the algorithm contract.
- Write silent fallbacks—always warn.