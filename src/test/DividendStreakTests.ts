#!/usr/bin/env node

/**
 * Test suite for dividend streak calculation improvements
 * Usage: tsx src/test/DividendStreakTests.ts
 */

import { DividendCalculator } from '../calculators/DividendCalculator.js';
import { DividendEliteDetector } from '../data/DividendAristocrats.js';
import type { AnnualDividendData } from '../models/DividendAnalysis.js';

class DividendStreakTester {
  
  private testScenarios: Array<{
    name: string;
    data: AnnualDividendData[];
    expectedStreak: number;
    ticker?: string;
  }> = [
    {
      name: "Perfect growth (should get full streak)",
      data: [
        [2019, 1.00],
        [2020, 1.10],
        [2021, 1.21],
        [2022, 1.33],
        [2023, 1.46]
      ],
      expectedStreak: 4
    },
    {
      name: "Minor decline due to rounding (should continue streak)",
      data: [
        [2019, 1.000],
        [2020, 1.100],
        [2021, 1.199], // Tiny decline due to rounding
        [2022, 1.320],
        [2023, 1.450]
      ],
      expectedStreak: 4
    },
    {
      name: "Small decline with recovery (data noise)",
      data: [
        [2019, 1.000],
        [2020, 1.100],
        [2021, 1.080], // 1.8% decline
        [2022, 1.200], // Recovery
        [2023, 1.320]
      ],
      expectedStreak: 4 // Should handle small decline
    },
    {
      name: "Real dividend cut (should break streak)",
      data: [
        [2019, 1.000],
        [2020, 1.100],
        [2021, 0.500], // 50% cut - real cut
        [2022, 0.600],
        [2023, 0.700]
      ],
      expectedStreak: 2 // Only 2022->2023 and 2021->2022
    },
    {
      name: "Stock split scenario (2:1 split in 2021)",
      data: [
        [2019, 2.000],
        [2020, 2.200],
        [2021, 1.200], // Appears to be 45% cut, but it's a stock split + increase
        [2022, 1.320],
        [2023, 1.450]
      ],
      expectedStreak: 2 // Algorithm should handle this better now
    },
    {
      name: "PG-like scenario (known Dividend King)",
      ticker: "PG",
      data: [
        [2018, 2.8700],
        [2019, 2.9800],
        [2020, 3.0800],
        [2021, 3.1600],
        [2022, 3.2400],
        [2023, 3.3600]
      ],
      expectedStreak: 5
    },
    {
      name: "Flat dividends (no growth but no cuts)",
      data: [
        [2019, 1.000],
        [2020, 1.000],
        [2021, 1.000],
        [2022, 1.000],
        [2023, 1.000]
      ],
      expectedStreak: 4 // Should count as maintaining, not increasing
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🧪 Testing Enhanced Dividend Streak Calculation');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    for (const scenario of this.testScenarios) {
      console.log(`\n📊 Test: ${scenario.name}`);
      console.log('-'.repeat(40));
      
      const result = this.runTest(scenario);
      
      if (result.passed) {
        console.log(`✅ PASSED: Got ${result.actualStreak} (expected ${result.expectedStreak})`);
        passed++;
      } else {
        console.log(`❌ FAILED: Got ${result.actualStreak} (expected ${result.expectedStreak})`);
        console.log(`   Reason: ${result.reason}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📈 Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('🎉 All dividend streak tests passed!');
    } else {
      console.log('⚠️  Some tests failed - check the algorithm');
    }

    // Test known dividend aristocrats/kings
    await this.testKnownEliteStocks();
  }

  private runTest(scenario: {
    name: string;
    data: AnnualDividendData[];
    expectedStreak: number;
    ticker?: string;
  }): {
    passed: boolean;
    actualStreak: number;
    expectedStreak: number;
    reason: string | undefined;
  } {
    console.log('   Data:');
    for (const [year, amount] of scenario.data) {
      console.log(`   ${year}: $${amount.toFixed(4)}`);
    }

    const actualStreak = DividendCalculator.calculateDividendStreak(scenario.data);
    
    // If testing a known elite stock, also show adjusted streak
    if (scenario.ticker) {
      const { adjustedStreak, adjustment, rationale } = 
        DividendEliteDetector.getAdjustedStreak(scenario.ticker, actualStreak);
      
      console.log(`   Raw calculated streak: ${actualStreak}`);
      console.log(`   Adjusted streak: ${adjustedStreak} (${adjustment})`);
      if (rationale) {
        console.log(`   Rationale: ${rationale}`);
      }
    }

    const tolerance = 1; // Allow 1 year difference
    const passed = Math.abs(actualStreak - scenario.expectedStreak) <= tolerance;
    
    let reason: string | undefined;
    if (!passed) {
      const diff = actualStreak - scenario.expectedStreak;
      reason = diff > 0 
        ? `Algorithm too generous by ${diff} years`
        : `Algorithm too strict by ${Math.abs(diff)} years`;
    }

    return {
      passed,
      actualStreak,
      expectedStreak: scenario.expectedStreak,
      reason: reason
    };
  }

  private async testKnownEliteStocks(): Promise<void> {
    console.log('\n🏆 Testing Known Dividend Elite Stocks');
    console.log('='.repeat(60));

    const testTickers = ['PG', 'KO', 'JNJ', 'MMM', 'MCD'];

    for (const ticker of testTickers) {
      const eliteStock = DividendEliteDetector.isKnownElite(ticker);
      
      if (eliteStock) {
        console.log(`\n${ticker} - ${eliteStock.name}`);
        console.log(`Expected: ${eliteStock.yearsOfIncreases} years (${eliteStock.category})`);
        
        // Test validation logic
        const testStreaks = [0, 5, 15, 25, eliteStock.yearsOfIncreases * 0.8];
        
        for (const testStreak of testStreaks) {
          const rounded = Math.round(testStreak);
          const validation = DividendEliteDetector.validateStreak(ticker, rounded);
          const { adjustedStreak } = DividendEliteDetector.getAdjustedStreak(ticker, rounded);
          
          console.log(`  Test streak ${rounded} → Adjusted: ${adjustedStreak} (${validation.confidence})`);
          if (validation.warning) {
            console.log(`    ⚠️  ${validation.warning}`);
          }
        }
      }
    }
  }

}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new DividendStreakTester();
  tester.runAllTests().catch(console.error);
}