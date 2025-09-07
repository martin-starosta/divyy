DDM Module — Hands-Off Specification

Goal: a drop-in, fully testable module that computes dividend-only intrinsic value (Gordon Growth / DDM) with practical safeguards, sensitivity bands, and explainability. It must be pure, deterministic, and provider-agnostic, so the CLI and the (future) Next.js API can call it without side effects.

0) Scope & Non-Goals

In scope

Gordon Growth DDM (perpetual growth) using 
𝑃
=
𝐷
1
𝑟
−
𝑔
P=
r−g
D
1
	​

	​

.

Safe construction of 
𝐷
1
D
1
	​

 (forward dividend) from history, with clamping rules.

Sensitivity analysis over ranges of 
𝑟
r and 
𝑔
g.

Optional FX and inflation (“real yield”) adjustments.

Warnings & explainability payloads.

Stable JSON output for DB persistence and UI rendering.

Not in scope (v1)

Multi-stage DDM, H-model, or explicit multi-period dividend paths.

Equity risk premium estimation or CAPM for 
𝑟
r.

Price momentum or non-dividend factors (handled elsewhere).

1) Inputs & Types
// Minimal normalized financial inputs
export type DividendEvent = { date: string; amount: number }; // ISO date, cash per share in source currency

export type DdmInputs = {
  price: number | null;           // last traded price (same currency as dividends)
  currency: string;               // ISO code, e.g., "USD"
  dividendsTTM?: number | null;   // optional precomputed TTM dividends per share
  dividendEvents?: DividendEvent[];// raw events (>= 3 years recommended)
  // fundamentals for sanity checks:
  epsPayoutRatio?: number | null; // 0..N (e.g., 0.62)
  fcfPayoutRatio?: number | null; // 0..N
  streakYears?: number | null;    // consecutive non-decreasing annual dividends
  // context:
  asOf: string;                   // ISO timestamp of analysis
  providerMeta?: Record<string, unknown>;
};

// Configuration & policy
export type DdmConfig = {
  requiredReturn: number;     // r, e.g., 0.09
  gFromCAGR?: "5y" | "3y" | "mix"; // which source CAGR to prefer if both available
  cagr3?: number | null;      // derived elsewhere if available
  cagr5?: number | null;
  // Safety clamps
  growthClamp: { min: number; max: number }; // default: {-0.10, +0.15}
  // Sustainability gates:
  maxEpsPayoutForGrowth: number; // e.g., 0.80 (above -> g capped at <= 0)
  maxFcfPayoutForGrowth: number; // e.g., 1.00 (above -> g capped at <= 0)
  minStreakForGrowth: number;    // e.g., 3 years (below -> g <= 0)
  // Sensitivity
  sensitivity: {
    r: number[]; // e.g., [0.07, 0.08, 0.09, 0.10, 0.11]
    g: number[]; // e.g., [-0.02, 0.00, 0.03, 0.05]
  };
  // Adjustments (optional)
  fxRateToHome?: number | null; // multiply dividends & price into home currency
  homeCurrency?: string | null;
  inflationYoY?: number | null; // CPI YoY, decimal, e.g., 0.031
  // Numerical guard
  epsilon?: number; // small number for r - g denominator safety, default 1e-6
  // Version tag
  version: string;  // e.g., "ddm@1.0.0"
};


Notes

If dividendsTTM absent, module will compute TTM from dividendEvents (sum last 365d).

If both cagr3 and cagr5 provided, gFromCAGR selects precedence; else module derives from events.

FX and inflation are optional; if present, they affect outputs/annotations but not the core formula beyond unit normalization.

2) Outputs
export type DdmResult = {
  algo: "ddm";
  version: string;
  asOf: string;
  currency: string;           // input currency (or home currency if FX applied)
  inputsUsed: {
    D1: number | null;        // forward dividend used in main calc
    r: number;                // required return
    g: number | null;         // effective growth used
  };
  fairValue: number | null;   // P* = D1 / (r - g), null if invalid
  price?: number | null;      // normalized price in output currency
  upsidePct?: number | null;  // (fairValue - price) / price
  // sensitivity grids (if config.sensitivity set)
  sensitivity?: {
    r: number[];
    g: number[];
    matrix: (number | null)[][]; // fair values; matrix[i][j] corresponds to r[i], g[j]
  };
  // auxiliary metrics
  ttmDividend?: number | null;
  baseGrowths?: { cagr3?: number | null; cagr5?: number | null };
  appliedClamps?: { min: number; max: number; reason?: string[] };
  realYield?: { nominalFwdYield?: number | null; inflation?: number | null; realFwdYield?: number | null };
  // explainability & warnings
  explain: {
    steps: string[];          // ordered human-readable narrative
    drivers: {
      payoutHealth?: "good"|"ok"|"stressed"|"n/a";
      streakBadge?: "none"|"aristocrat"|"king"|"custom";
      growthPolicy?: "clampedNegative"|"zeroedDueToRisk"|"bounded"|"asIs";
    };
  };
  warnings: string[];         // machine-readable codes (below)
  providerMeta?: Record<string, unknown>;
};


Warning codes (examples)

missing_dividend_series

insufficient_history_for_cagr

growth_zeroed_due_to_high_payout

growth_zeroed_due_to_low_streak

growth_clamped_to_bounds

denominator_too_small_r_le_g

fx_applied_home_currency_differs

inflation_exceeds_growth_real_yield_negative

3) Algorithm Steps

Normalize currency (optional)

If fxRateToHome present, multiply price, all dividends, and derived D1 by this rate.

Set output currency = homeCurrency || currency.

Add warning fx_applied_home_currency_differs if applied.

Compute TTM dividends (if needed)

If dividendsTTM missing and dividendEvents present: sum amount where event.date >= asOf - 365d.

If unavailable → set ttmDividend = null and push missing_dividend_series.

Derive base growth (gBase)

Prefer config (gFromCAGR): cagr5, else cagr3, else derive from annualized series.

If fewer than 3 annual points → gBase = null, warn insufficient_history_for_cagr.

Apply sustainability policy to growth

Start g = clamp(gBase ?? 0, growthClamp.min, growthClamp.max).

If epsPayoutRatio > maxEpsPayoutForGrowth OR fcfPayoutRatio > maxFcfPayoutForGrowth OR streakYears < minStreakForGrowth ⇒ set g = Math.min(g, 0) and record reason(s).

If clamp boundary hit, add growth_clamped_to_bounds.

Compute forward dividend 
𝐷
1
D
1
	​


If ttmDividend available: D1 = ttmDividend * (1 + g).

Else D1 = null.

Guard denominator

If g == null or D1 == null → fairValue = null.

If r - g <= epsilon → fairValue = null, warn denominator_too_small_r_le_g.

Fair value & upside

fairValue = D1 / (r - g).

If price present → upsidePct = (fairValue - price)/price.

Real yield (optional)

Nominal forward yield = D1 / price (if both present).

If inflationYoY present → realFwdYield = nominal - inflation; if negative, warn inflation_exceeds_growth_real_yield_negative.

Sensitivity matrix (optional)

For every ri in sensitivity.r and gj in sensitivity.g, compute:

if ri - gj <= epsilon or D1 == null → null.

else D1' = ttmDividend * (1 + gj); P* = D1' / (ri - gj).

Return rectangular matrix.

Explainability

Populate explain.steps with a concise narrative:

e.g., “Used 5y CAGR 4.6% → clamped to 3.0% due to payout 85%.”

“Computed D1 from TTM 4.00 → D1 4.12.”

“Applied r=9%; fair value = $63.80; downside –12% vs $72.50.”

Drivers: payout health, streak badge, growth policy.

4) Config Defaults
export const DEFAULT_DDM_CONFIG: DdmConfig = {
  requiredReturn: 0.09,
  gFromCAGR: "5y",
  growthClamp: { min: -0.10, max: 0.15 },
  maxEpsPayoutForGrowth: 0.80,
  maxFcfPayoutForGrowth: 1.00,
  minStreakForGrowth: 3,
  sensitivity: { r: [0.07,0.08,0.09,0.10,0.11], g: [-0.02,0.00,0.03,0.05] },
  epsilon: 1e-6,
  version: "ddm@1.0.0",
};

5) Determinism & Purity

Pure function: (inputs, config) => result

No I/O: No fetching, logging, or DB calls.

No randomness: No timers, no global state.

Idempotent: Same inputs produce identical outputs.

6) Integration Contracts

CLI

The CLI computes TTM and CAGRs (or passes raw events) then calls runDdm(inputs, config).

Flags:

--r <float> overrides requiredReturn.

--ddm-sensitivity on|off.

--home-currency EUR --fx 0.92 (if you prefetch FX).

--inflation 0.031.

Next.js API

Server route receives symbol, reads cached analysis from Supabase.

If recompute, it builds DdmInputs and calls the module.

Response JSON embeds DdmResult unmodified for UI components.

7) Example Output (JSON)
{
  "algo": "ddm",
  "version": "ddm@1.0.0",
  "asOf": "2025-08-30T12:00:00Z",
  "currency": "USD",
  "inputsUsed": { "D1": 4.12, "r": 0.09, "g": 0.02 },
  "fairValue": 68.67,
  "price": 72.50,
  "upsidePct": -0.0528,
  "sensitivity": {
    "r": [0.07,0.08,0.09,0.10,0.11],
    "g": [-0.02,0.00,0.03,0.05],
    "matrix": [
      [ 51.00, 55.14, 63.36, 73.88 ],
      [ 45.55, 49.14, 56.00, 64.56 ],
      [ 41.20, 44.22, 50.33, 57.26 ],
      [ 37.67, 40.20, 45.56, 51.75 ],
      [ 34.77, 36.87, 41.49, 47.21 ]
    ]
  },
  "ttmDividend": 4.04,
  "baseGrowths": { "cagr3": 0.018, "cagr5": 0.028 },
  "appliedClamps": { "min": -0.10, "max": 0.15, "reason": ["bounded"] },
  "realYield": { "nominalFwdYield": 0.0568, "inflation": 0.031, "realFwdYield": 0.0258 },
  "explain": {
    "steps": [
      "5y dividend CAGR 2.8% detected; bounded to 2.0% for conservatism.",
      "TTM dividends 4.04 -> D1 = 4.12.",
      "Required return r=9.0%; fair value = $68.67; vs price $72.50 = -5.3%."
    ],
    "drivers": { "payoutHealth": "ok", "streakBadge": "aristocrat", "growthPolicy": "bounded" }
  },
  "warnings": [],
  "providerMeta": { "dividends": "av.daily_adjusted", "price": "yahoo.quote" }
}

8) Testing Strategy

Unit tests (vitest/jest)

Core formula: Given D1, r, g, assert P* exactly.

Clamp logic: Payout/streak force g <= 0 when thresholds breached.

Edge cases:

r <= g → fairValue = null, denominator_too_small_r_le_g.

Missing TTM & events → missing_dividend_series.

Few events (<3y) → insufficient_history_for_cagr.

Sensitivity:

Matrix shape matches r.length × g.length; nulls where r-g <= epsilon.

Fixture tests

Stable tickers (e.g., PG, JNJ) with canned dividend series.

Yield trap stock with high payout & negative growth.

Snapshot tests

JSON output for representative inputs (ensure schema stability).

Determinism

Same inputs produce same outputs (no time dependence other than asOf).

9) Performance & Limits

O(N) over dividend events; sensitivity grid O(|r|×|g|), typically tiny.

No external calls → negligible latency.

Works with minimal memory; safe to run in serverless.

10) Warnings Catalog (v1)
Code	When
missing_dividend_series	No TTM and no events provided
insufficient_history_for_cagr	<3 annual points available
growth_zeroed_due_to_high_payout	EPS payout > threshold OR FCF payout > threshold
growth_zeroed_due_to_low_streak	Streak < minStreakForGrowth
growth_clamped_to_bounds	g clamped to growthClamp.min or .max
denominator_too_small_r_le_g	r - g <= epsilon
fx_applied_home_currency_differs	FX normalization applied
inflation_exceeds_growth_real_yield_negative	Real forward yield < 0
11) UX & Reporting Guidelines

Always render: D1, r, g, fairValue, upside%.

Show Sensitivity band: min/median/max across g or r (e.g., a line: FV range: $61–$74).

Print explain steps (3 lines max) and warnings (bullet list).

If real yield computed, show "Nominal fwd yield X%, Real fwd yield Y% (inflation Z%)".

12) Versioning & Compatibility

Version string ddm@MAJOR.MINOR.PATCH baked into results.

Any change to clamping policy increments MINOR; output schema changes increment MAJOR.

Store version with every analysis row for historical comparability.

13) Roadmap (beyond v1)

v1.1: Multi-stage DDM (2-stage: near-term g1, terminal g2).

v1.2: Auto-estimation of r from risk-free + market premium (configurable).

v1.3: Confidence score (data completeness, variance in history).

v2.0: Blend with ML cut-risk probability to adjust 
𝑔
g dynamically.

14) Acceptance Criteria (DoD)

Pure function implemented: runDdm(inputs: DdmInputs, config?: Partial<DdmConfig>): DdmResult.

95%+ unit test coverage for control flow (clamps, guards, sensitivity).

JSON schema validated (stable keys; documented types).

Deterministic outputs for fixed fixtures.

Clear warnings on all degenerate cases.

Integrated into CLI & Next.js without code changes outside the module (other than wiring).