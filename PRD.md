# Product Requirements Document: Alpha Vantage Integration

## 1. Overview

This document outlines the requirements for integrating Alpha Vantage (AV) as a supplementary data provider into the `divvy-potential` CLI. The primary goal is to enhance the reliability and depth of financial data, enabling more accurate dividend analysis and new feature development.

## 2. Problem & Justification

The CLI currently relies solely on Yahoo Finance. While free and unlimited, its dividend and split data can be inconsistent, and it lacks a structured earnings calendar. To provide more robust and trustworthy analysis, we need a secondary, high-precision data source.

**Why Alpha Vantage?**
- **High-Precision Data:** Provides clean, split-adjusted dividend histories and structured, reliable financial statements.
- **New Capabilities:** Enables features like earnings calendar awareness to flag potential risks.
- **Cost-Effective:** Offers a free tier that, when used judiciously, can meet our needs.

## 3. Dual-Provider Strategy

To maximize data quality while managing costs, we will implement a dual-provider strategy that leverages the strengths of both Yahoo Finance and Alpha Vantage.

-   **Yahoo Finance (Unlimited Backbone):** Serves as the primary, high-volume data source. It will be used for all intraday lookups (price, quotes) and as a comprehensive fallback if Alpha Vantage is unavailable or rate-limited. Its data is generally good for initial assessments.

-   **Alpha Vantage (Precision Booster):** Serves as the secondary, rate-limited source for accuracy-critical data that is often inconsistent from Yahoo. Its use will be rationed and reserved for specific tasks.

### Provider Responsibilities

| Feature | Yahoo Finance (Free, Unlimited) | Alpha Vantage (25/day Free Tier) |
| :--- | :--- | :--- |
| **Current price / market data** | ✔ (Primary) | ✔ (Fallback) |
| **Dividend events (history)** | ✔ (Approximate, can be patchy) | ✔ (Precise, structured) **✅ Preferred** |
| **Split adjustment** | ❌ (Inconsistent) | ✔ (Explicit `splitCoefficient`) **✅ Preferred** |
| **TTM dividend & CAGR** | ✔ (Approximate) | ✔ (Precise, reliable) **✅ Preferred** |
| **EPS payout ratio** | ✔ | ✔ |
| **Free cash flow payout** | ✔ (Incomplete) | ✔ (Cleaner, more reliable) **✅ Preferred** |
| **Company overview/meta** | ✔ | ✔ (More structured) **✅ Preferred** |
| **Sector/industry** | ✔ | ✔ |
| **Earnings calendar** | ❌ | ✔ **✅ Sole Provider** |

### Merge & Fallback Policy
- **For a given ticker, the system will:**
    1.  Attempt to fetch precision-critical data (marked with ✅ above) from Alpha Vantage, subject to rate limits and caching rules.
    2.  Fetch all other data from Yahoo Finance.
    3.  If an AV call fails or is skipped, the system will fall back to Yahoo Finance for that data point.
    4.  All data points will be tagged with their source (e.g., `av.dividends`, `yahoo.price`) in the database.

## 4. Technical Requirements

### 4.1. API Rate Limiting & Caching
- **Challenge:** The AV free tier has a strict limit of ~25 requests per day. Each ticker analysis could consume 5-6 calls.
- **Mitigation Strategy:**
    - **Restrict AV Usage:** AV calls should be reserved for:
        - **Daily Watchlist Job:** A batch process running once a day for a small, high-priority set of tickers (e.g., 5-10).
        - **First-Time Analysis:** When a new ticker is analyzed, prime the database with high-quality AV data.
    - **Aggressive Caching:** Store all AV and Yahoo responses in Supabase to minimize redundant fetches.
        - AV Fundamentals & Dividends: Cache for 24-48 hours.
        - Yahoo Data: Cache for 24 hours.
    - **Request Budgeting:**
        - Implement a global daily request ceiling via an environment variable (e.g., `AV_DAILY_CEILING=25`).
        - *Example Budget (25 req/day):*
            - 5 watchlist tickers × (1 Daily Adjusted + 2 Statements + 1 Overview) = 20 requests
            - 1 earnings calendar call (for all tickers) = 1 request
            - *Total: 21 requests (leaving 4 for ad-hoc use)*
    - **Graceful Fallback:** If the rate limit is hit (HTTP 429), the system must automatically fall back to Yahoo Finance and log a `warning: alpha_vantage_rate_limited`.

### 4.2. Supabase Schema Changes
- **`analyses` table:**
    - `data_sources` (text[]): An array to track the origin of each piece of data (e.g., `['av.dividends', 'yahoo.price']`).
    - `warnings` (jsonb): A field to store structured warnings (rate-limiting, data gaps, etc.).
- **`raw_snapshot` table:**
    - `providers` (jsonb): Store the raw JSON responses from both providers: `{ "yahoo": {...}, "av": {...} }`.

### 4.3. API Mapping
- **Dividends & Splits:** `TIME_SERIES_DAILY_ADJUSTED`
- **Cash Flow:** `CASH_FLOW`
- **Income Statement:** `INCOME_STATEMENT`
- **Balance Sheet:** `BALANCE_SHEET`
- **Company Metadata:** `OVERVIEW`
- **Earnings Calendar:** `EARNINGS_CALENDAR`

## 5. New Features
- **Enhanced Dividend Analysis:** Precise TTM yields and CAGR, aware of stock splits.
- **Payout & Coverage Ratios:** Accurate EPS and FCF payout ratios.
- **Event Risk Notifications:** Flag upcoming earnings dates.
- **Sector-Based Leaderboards:** Use structured sector/industry data.
- **Efficient Watchlist Processing:** Daily job to pre-fetch AV data for key tickers.

## 6. CLI Enhancements
- **Flags:**
    - `--provider <av|yahoo|auto>` (default `auto`).
    - `--no-av`: Disable AV for a run.
    - `--budget <n>`: Cap AV calls per run.
- **Output:**
    - `Data sources:` line listing the provider for each field.
    - `Warnings:` section for rate-limits, missing fields, etc.

## 7. Scoring & UX Rules
- **Data Quality Clamps:** If `streak ≥ 20` but AV CAGR < –5%, clamp growth to [0%, 3%] and warn.
- **Partial Data Handling:** If FCF data is missing but EPS payout ≤ 60%, assign FCF score = 50 and warn.
- **Confidence Indicator:** Show a 0–100 “data confidence” score based on providers and freshness.
- **Explainability:** Always display which provider supplied each metric.

## 8. Testing Requirements
- **Fixtures:** Use stored AV JSON responses for tests.
- **Reconciliation Tests:** If AV vs. Yahoo dividends differ by >10%, raise `data_mismatch`.
- **Fallback Tests:** Simulate AV 429 errors and confirm Yahoo fallback works.

## 9. Implementation Roadmap
1.  **Core Integration:** Integrate AV for dividends and fundamentals.
2.  **Persistence:** Implement Supabase schema changes for `data_sources` and `warnings`.
3.  **Batch Processing:** Create a daily watchlist job to pre-fetch AV data.
4.  **Advanced Features:** Add earnings calendar awareness and scoring adjustments.

## 10. Potential Risks & Mitigations
- **Risk:** Strict AV API rate limits.
    - **Mitigation:** Rationed usage via daily batch jobs, aggressive caching, and graceful fallback.
- **Risk:** Incomplete AV data coverage for some tickers.
    - **Mitigation:** Graceful fallback to Yahoo and clear warnings.
- **Risk:** Limited historical data from AV (~5 years).
    - **Mitigation:** Analysis requiring longer history must account for this.
