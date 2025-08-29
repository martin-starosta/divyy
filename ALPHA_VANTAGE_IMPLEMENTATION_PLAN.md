# Alpha Vantage Integration Implementation Plan

## Overview
This plan implements Alpha Vantage as a supplementary data provider while maintaining full backward compatibility. Each phase delivers working functionality that can be deployed independently.

---

## **Phase 1: Alpha Vantage Service Foundation** 
*Estimated: 2-3 hours*

### Objectives
- Create basic Alpha Vantage service with core API endpoints
- Add Alpha Vantage as optional fallback (no breaking changes)
- Maintain full Yahoo Finance functionality

### Implementation
1. **Create AlphaVantageService**
   - `src/services/AlphaVantageService.ts`
   - Implement basic API calls: `OVERVIEW`, `TIME_SERIES_DAILY_ADJUSTED`, `INCOME_STATEMENT`, `CASH_FLOW`
   - Add proper TypeScript interfaces for AV responses
   - Include rate limiting awareness (429 handling)

2. **Environment Configuration**
   - Add `ALPHA_VANTAGE_API_KEY` to `.env` ✅ (already done)
   - Add `AV_DAILY_CEILING=25` for rate limit management

3. **Basic Integration Point**
   - Modify `DividendAnalysisService` to optionally use AV for company overview
   - Add `--provider` CLI flag (yahoo|av|auto) with yahoo as default
   - Graceful fallback to Yahoo Finance on any AV failure

### Deliverable
- CLI works exactly as before by default
- Users can opt-in to AV with `--provider av` flag
- Company metadata comes from AV when requested, Yahoo otherwise

### Status: ⏳ Pending

---

## **Phase 2: Database Schema Extensions**
*Estimated: 1-2 hours*

### Objectives  
- Extend database schema to track data sources
- Add warning/metadata storage capabilities
- Maintain backward compatibility with existing data

### Implementation
1. **Schema Migration**
   - Add `data_sources` text[] field to `analyses` table
   - Add `warnings` jsonb field to `analyses` table
   - Create `raw_snapshots` table for storing raw API responses
   - Update migration scripts and `schema-setup.sql`

2. **DatabaseService Updates**
   - Extend `AnalysisRecord` interface with new fields
   - Update `saveAnalysis` method to handle data sources tracking
   - Modify `hydrateAnalysisFromRecord` for new fields

3. **Data Source Tracking**
   - Add utility functions to track which provider supplied each data point
   - Format: `['yahoo.price', 'av.overview', 'yahoo.fundamentals']`

### Deliverable
- Database supports tracking data sources and warnings
- Existing analyses continue to work (nullable fields)
- New analyses include source tracking information

### Status: ⏳ Pending

---

## **Phase 3: Dual Provider Strategy Implementation**
*Estimated: 3-4 hours*

### Objectives
- Implement intelligent provider selection based on PRD preferences
- Add dividend and fundamental data from Alpha Vantage
- Maintain seamless fallback to Yahoo Finance

### Implementation
1. **Provider Strategy Service**
   - `src/services/DataProviderStrategy.ts`
   - Implement decision logic: AV for precision-critical data, Yahoo for everything else
   - Handle provider failures with automatic fallback

2. **Enhanced DividendAnalysisService**  
   - Integrate AV dividend history (preferred over Yahoo)
   - Use AV fundamentals for FCF calculations when available
   - Merge data from both providers intelligently
   - Track data sources throughout analysis pipeline

3. **Data Quality Improvements**
   - Implement reconciliation checks (warn if AV vs Yahoo dividends differ >10%)
   - Add split-adjustment awareness using AV's explicit `splitCoefficient`
   - Improve TTM dividend and CAGR calculations with AV precision

4. **Output Enhancements**
   - Add "Data sources:" line to analysis output
   - Show warnings section for any provider issues
   - Maintain existing output format with additions

### Deliverable
- Analysis uses best data from each provider automatically  
- Clear indication of data sources in output
- Graceful degradation when AV is unavailable
- Improved accuracy for dividend calculations

### Status: ⏳ Pending

---

## **Phase 4: Rate Limiting & Intelligent Caching**
*Estimated: 2-3 hours*

### Objectives
- Implement smart rate limiting to stay within AV free tier
- Add aggressive caching strategy for AV responses  
- Create daily request budget management

### Implementation
1. **Rate Limiting Service**
   - `src/services/RateLimitService.ts`
   - Track daily AV API usage in database or local storage
   - Implement request budgeting with `AV_DAILY_CEILING`
   - Automatically disable AV when limit approached

2. **Enhanced Caching Strategy**
   - Extend existing 24h cache to differentiate provider sources
   - Cache AV responses for 24-48h (longer than Yahoo's 24h)
   - Add cache hit/miss tracking for monitoring

3. **Request Prioritization**
   - Reserve AV calls for new tickers or stale data
   - Implement request queue for optimal AV usage
   - Add `--budget <n>` CLI flag to limit AV calls per run

4. **Monitoring & Alerting**
   - Add detailed logging for rate limit status
   - Warning messages when approaching daily limit
   - Graceful fallback messaging to users

### Deliverable
- Automatic rate limit management
- Optimal use of limited AV API calls
- Extended caching reduces redundant requests  
- Clear user feedback on API usage status

### Status: ⏳ Pending

---

## **Phase 5: Advanced Features & CLI Enhancements**
*Estimated: 3-4 hours*

### Objectives
- Add earnings calendar awareness
- Implement confidence scoring
- Create sector-based analysis improvements
- Complete CLI flag additions

### Implementation
1. **Earnings Calendar Feature**
   - Add `EARNINGS_CALENDAR` AV endpoint integration
   - Flag upcoming earnings dates in analysis output
   - Add warning for potential earnings-related volatility

2. **Confidence Scoring**
   - Implement 0-100 data confidence score based on:
     - Provider reliability (AV > Yahoo for precision data)
     - Data freshness
     - Completeness of financial data
   - Display confidence score in analysis output

3. **Enhanced Sector Analysis**
   - Use AV's structured sector/industry data  
   - Improve sector-based leaderboards
   - Add sector comparison context to individual analyses

4. **Complete CLI Integration**
   - Add remaining CLI flags: `--no-av`, `--force-fresh`
   - Enhance help text with provider options
   - Add verbose output showing detailed provider information

5. **Data Quality Improvements**
   - Implement growth rate clamping rules for high-streak stocks
   - Enhanced partial data handling with clear warnings
   - Reconciliation alerts for significant provider disagreements

### Deliverable
- Full-featured dual-provider analysis
- Earnings calendar risk awareness
- Confidence scoring for analysis quality
- Complete CLI interface with all PRD requirements

### Status: ⏳ Pending

---

## **Phase 6: Watchlist & Batch Processing** 
*Estimated: 2-3 hours*

### Objectives
- Create daily batch job for efficient AV usage
- Implement watchlist concept for priority tickers
- Add scheduling capability for optimal API usage

### Implementation
1. **Watchlist Management**
   - Add watchlist table to database
   - CLI commands to manage watchlist tickers
   - Priority-based AV allocation for watchlist items

2. **Daily Batch Job**
   - Create `scripts/daily-refresh.js` for automated runs
   - Batch process watchlist tickers during off-peak hours
   - Optimal request distribution across AV endpoints

3. **Scheduling Integration**
   - Add cron job configuration examples
   - Environment-based scheduling controls
   - Monitoring and alerting for batch job failures

### Deliverable
- Automated daily refresh for priority tickers
- Efficient use of AV API quota through batching
- Watchlist management capabilities
- Production-ready scheduling system

### Status: ⏳ Pending

---

## Success Criteria

✅ **After Each Phase:**
- CLI continues to work without breaking changes
- Existing functionality remains intact
- New features are additive and optional
- Database migrations are backward compatible
- Error handling maintains graceful degradation

✅ **Final State:**
- Dual-provider system with intelligent selection
- 25 AV calls/day budget management
- 24-48h caching strategy
- Complete data source tracking
- Enhanced dividend analysis accuracy
- Earnings calendar awareness
- Confidence scoring
- Robust fallback mechanisms

---

## Implementation Notes

### Dependencies to Add
```json
{
  "axios": "^1.6.0",
  "@types/node": "^20.10.0"
}
```

### Environment Variables
```env
ALPHA_VANTAGE_API_KEY=your_api_key_here
AV_DAILY_CEILING=25
```

### PRD Requirements Mapping
- ✅ Dual-provider strategy (Phases 1-3)
- ✅ Rate limiting & caching (Phase 4) 
- ✅ Data source tracking (Phase 2)
- ✅ CLI enhancements (Phase 5)
- ✅ Batch processing (Phase 6)
- ✅ Earnings calendar (Phase 5)
- ✅ Confidence scoring (Phase 5)

This phased approach ensures we can deploy working code after each iteration while building toward the complete Alpha Vantage integration specified in the PRD.