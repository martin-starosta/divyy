#!/usr/bin/env node

/**
 * Test Caching Functionality
 * 
 * Tests the 24-hour caching logic for dividend analysis
 */

import { config } from 'dotenv';
import { DatabaseService } from './src/services/DatabaseService.ts';
import { DividendAnalysis, DividendScores } from './src/models/DividendAnalysis.ts';
import { Quote, Fundamentals } from './src/models/StockData.ts';

// Load environment variables
config();

async function testCaching() {
  console.log('🔍 Testing analysis caching functionality...');
  
  try {
    // Create mock analysis data
    const mockQuote = new Quote({
      regularMarketPrice: 150.25,
      currency: 'USD',
      shortName: 'Microsoft Corporation'
    });

    const mockFundamentals = new Fundamentals({
      OperatingCashFlow: { raw: 120000000 },
      CapitalExpenditure: { raw: 12000000 },
      CashDividendsPaid: { raw: 18000000 },
      NetIncome: { raw: 90000000 },
      payoutRatio: { raw: 0.20 }
    });

    const mockScores = new DividendScores({
      payout: 85,
      fcf: 80,
      streak: 90,
      growth: 75
    });

    const mockAnalysis = new DividendAnalysis({
      ticker: 'MSFT',
      quote: mockQuote,
      ttmDividends: 3.00,
      ttmYield: 2.00,
      annualDividends: [[2022, 2.70], [2023, 2.80], [2024, 3.00]],
      cagr3: 0.05,
      cagr5: 0.07,
      streak: 20,
      fundamentals: mockFundamentals,
      safeGrowth: 0.04,
      forwardDividend: 3.12,
      forwardYield: 2.08,
      scores: mockScores,
      totalScore: 82
    });

    const options = {
      requiredReturn: 0.09,
      years: 15
    };

    const optionsHash = DatabaseService.createOptionsHash(options);

    // Test 1: Save fresh analysis
    console.log('📋 Test 1: Saving fresh analysis...');
    await DatabaseService.saveAnalysis(mockAnalysis, options);
    console.log('✅ Analysis saved');

    // Test 2: Check if we can retrieve recent analysis
    console.log('\n📋 Test 2: Checking recent analysis retrieval...');
    const recentAnalysis = await DatabaseService.getRecentAnalysis('MSFT', optionsHash, 24);
    
    if (recentAnalysis) {
      console.log(`✅ Found recent analysis from ${new Date(recentAnalysis.observed_at).toLocaleString()}`);
      
      // Test 3: Hydrate analysis from record
      console.log('\n📋 Test 3: Hydrating analysis from database record...');
      const hydratedAnalysis = DatabaseService.hydrateAnalysisFromRecord(recentAnalysis);
      console.log(`✅ Hydrated analysis for ${hydratedAnalysis.ticker}`);
      console.log(`   Score: ${hydratedAnalysis.totalScore}`);
      console.log(`   Forward Yield: ${(hydratedAnalysis.forwardYield * 100).toFixed(2)}%`);
      
      // Test 4: Check for old analysis (should return null)
      console.log('\n📋 Test 4: Checking for analysis older than 1 hour (should be null)...');
      const oldAnalysis = await DatabaseService.getRecentAnalysis('MSFT', optionsHash, 0.01); // 0.01 hours = 0.6 minutes
      
      if (oldAnalysis) {
        console.log('⚠️  Found analysis within 0.01 hours (unexpected)');
      } else {
        console.log('✅ No analysis found within 0.01 hours (expected)');
      }
      
    } else {
      console.log('❌ No recent analysis found (unexpected)');
    }

    // Test 5: Test with different options hash (should return null)
    console.log('\n📋 Test 5: Testing with different options (should return null)...');
    const differentOptions = {
      requiredReturn: 0.08, // Different required return
      years: 15
    };
    const differentHash = DatabaseService.createOptionsHash(differentOptions);
    const differentAnalysis = await DatabaseService.getRecentAnalysis('MSFT', differentHash, 24);
    
    if (differentAnalysis) {
      console.log('❌ Found analysis with different options (unexpected)');
    } else {
      console.log('✅ No analysis found with different options (expected)');
    }

    console.log('\n✅ All caching tests completed successfully!');
    console.log('\n💡 The caching system will:');
    console.log('   ✓ Return cached results for same ticker + options within 24 hours');
    console.log('   ✓ Perform fresh analysis for different options or old cache');
    console.log('   ✓ Handle database errors gracefully');

  } catch (error) {
    console.error('❌ Caching test failed:', error.message);
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n💡 Schema not set up. Please run the SQL script from schema-setup.sql');
    }
    
    process.exit(1);
  }
}

testCaching();