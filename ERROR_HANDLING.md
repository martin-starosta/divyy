# Error Handling & Data Validation

This document describes the comprehensive error handling and data validation system implemented in Divvy.

## Overview

The error handling system provides:
- ✅ **Input Validation** - Strict validation of all user inputs
- ✅ **Custom Error Types** - Specific error classes for different scenarios
- ✅ **Automatic Retries** - Smart retry logic for network failures
- ✅ **Data Quality Checks** - Validation of API responses and data integrity
- ✅ **Fallback Mechanisms** - Graceful degradation when data is missing
- ✅ **User-Friendly Messages** - Clear, actionable error messages
- ✅ **Health Monitoring** - Service availability checks

## Error Types

### ValidationError
**When**: Invalid user input (ticker format, parameter ranges)
**Example**: `divvy INVALID$TICKER@`
**Response**: Clear formatting requirements and examples

### TickerNotFoundError
**When**: Ticker symbol doesn't exist or isn't supported
**Example**: `divvy FAKESTK`
**Response**: Suggestions for finding correct ticker symbols

### NetworkError
**When**: Internet connection issues or API timeouts
**Response**: Troubleshooting steps and automatic retries

### RateLimitError
**When**: Too many requests in short timeframe
**Response**: Wait time suggestions and usage tips

### DataSourceError
**When**: Yahoo Finance API issues or changes
**Response**: Service status and alternative suggestions

### InsufficientDataError
**When**: Not enough data for analysis (new companies, non-dividend stocks)
**Response**: Explanation of data requirements

### DataQualityError
**When**: API returns malformed or suspicious data
**Response**: Data validation warnings and estimates

## Input Validation

### Ticker Symbols
- **Pattern**: `[A-Z0-9.-]{1,10}`
- **Sanitization**: Automatic uppercase conversion
- **Validation**: Format checking, length limits
- **Special Cases**: Exchange suffixes (e.g., "BMW.DE")

```typescript
// Valid tickers
divvy AAPL      ✅
divvy MSFT      ✅  
divvy BRK.B     ✅
divvy BMW.DE    ✅

// Invalid tickers
divvy INVALID$  ❌ (special characters)
divvy ""        ❌ (empty)
divvy TOOLONG123 ❌ (too long)
```

### Years Parameter
- **Range**: 1-50 years
- **Default**: 15 years
- **Validation**: Integer checking, range validation

```bash
divvy AAPL --years 10   ✅
divvy AAPL --years 1    ✅
divvy AAPL --years 50   ✅
divvy AAPL --years 100  ❌ (too high)
divvy AAPL --years abc  ❌ (not number)
```

### Required Return Parameter
- **Range**: 0.1% - 100%
- **Default**: 9%
- **Format**: Decimal (0.09 = 9%)

```bash
divvy AAPL --r 0.08   ✅ (8%)
divvy AAPL --r 0.12   ✅ (12%)
divvy AAPL --r 1.5    ❌ (150%, too high)
divvy AAPL --r -0.05  ❌ (negative)
```

## Retry Logic

### Network Failures
- **Attempts**: Up to 3 retries
- **Backoff**: Exponential with jitter (1s, 2s, 4s)
- **Conditions**: Connection errors, timeouts, 5xx status codes

### Rate Limits
- **Attempts**: Up to 5 retries
- **Backoff**: Conservative (5s, 7.5s, 11.25s, etc.)
- **Respect**: `Retry-After` headers when provided

### Data Source Errors
- **Attempts**: Up to 2 retries
- **Fallback**: Multiple API endpoints (fundamentals → quoteSummary)
- **Circuit Breaker**: Temporary service blocking after repeated failures

## Data Quality Checks

### Quote Validation
- **Required**: Valid price data
- **Checks**: Price > 0, reasonable ranges, currency info
- **Warnings**: Unusual prices, missing company names

### Dividend History
- **Minimum**: 2 years of data required
- **Validation**: Date consistency, amount validation
- **Quality**: Temporal ordering, outlier detection

### Fundamental Data
- **Completeness**: Track missing fields (OCF, CapEx, etc.)
- **Reasonableness**: Detect extreme values
- **Estimates**: Conservative fallbacks for missing data

## Fallback Mechanisms

### Missing Fundamentals
When financial data is unavailable:
- **EPS Payout**: Conservative 80% assumption
- **FCF Coverage**: Minimal 1.2x coverage estimate
- **Growth Rate**: Zero growth assumption

### Limited Dividend History
For stocks with <5 years of data:
- **Synthetic History**: Backward extrapolation using growth trends
- **Conservative Bounds**: Limit growth assumptions
- **Clear Warnings**: Alert users to data limitations

### Data Interpolation
- **Gap Filling**: Linear interpolation for missing years
- **Trend Analysis**: Use available data to estimate missing points
- **Quality Scoring**: Reduce confidence scores for estimated data

## User Experience

### Error Messages
All error messages include:
- **Clear Description**: What went wrong
- **Root Cause**: Why it happened  
- **Action Items**: What the user can do
- **Examples**: Correct usage patterns

### Exit Codes
- **0**: Success
- **1**: Network/temporary error (retry recommended)
- **2**: Invalid input (fix command and retry)
- **3**: Permanent failure (don't retry)

### Verbosity Options
```bash
divvy AAPL                    # Standard output
divvy AAPL --verbose          # Show data quality details
divvy AAPL --no-warnings      # Suppress warnings
```

## Health Monitoring

### Service Health Check
- **Latency**: Response time measurement
- **Availability**: Service accessibility test
- **Error Tracking**: Pattern recognition for outages

### Data Quality Scoring
- **0-100 Scale**: Overall data completeness
- **Factors**: Price availability, dividend history, fundamentals
- **Thresholds**: Excellent (90+), Good (70+), Fair (50+), Poor (<50)

## Testing

### Error Scenarios
Run test suite with:
```bash
tsx src/test/ErrorScenarios.ts
```

Tests include:
- Input validation edge cases
- Network failure simulation
- Data quality boundary conditions
- Error message formatting
- CLI argument processing

### Manual Testing
```bash
# Test invalid ticker
divvy INVALID$

# Test missing arguments
divvy

# Test out-of-range parameters
divvy AAPL --years 100

# Test network issues (disconnect internet)
divvy AAPL
```

## Best Practices

### For Users
1. **Check Ticker**: Verify symbol spelling and exchange
2. **Start Small**: Use fewer years for initial testing
3. **Monitor Warnings**: Pay attention to data quality alerts
4. **Retry Policy**: Wait before retrying after rate limits

### For Developers
1. **Fail Fast**: Validate inputs immediately
2. **Be Specific**: Provide actionable error messages
3. **Log Context**: Include relevant details in errors
4. **Graceful Degradation**: Continue with estimates when possible
5. **Test Edge Cases**: Cover boundary conditions and failures

## Configuration

### Environment Variables
```bash
NODE_ENV=development    # Enable debug info
NODE_ENV=production     # Minimal error details
```

### Error Handling Tuning
Modify retry configurations in `src/utils/RetryHandler.ts`:
- `maxAttempts`: Number of retry attempts
- `baseDelayMs`: Initial delay between retries
- `backoffMultiplier`: Exponential backoff rate
- `retryableErrors`: Which error types to retry

This comprehensive error handling system ensures Divvy provides a robust, user-friendly experience even when dealing with unreliable financial data APIs and various failure scenarios.