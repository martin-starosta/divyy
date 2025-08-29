#!/usr/bin/env node

/**
 * Test Database Save Functionality
 * 
 * Tests saving a mock analysis to the database
 */

import { config } from 'dotenv';
import { DatabaseService } from './src/services/DatabaseService.ts';
import { DividendAnalysis, DividendScores } from './src/models/DividendAnalysis.ts';
import { Quote, Fundamentals } from './src/models/StockData.ts';

// Load environment variables
config();

async function testDatabaseSave() {
  console.log('🔍 Testing database save functionality...');
  
  try {
    // Create mock analysis data
    const mockQuote = new Quote({
      regularMarketPrice: 225.50,
      currency: 'USD',
      shortName: 'Apple Inc.'
    });

    const mockFundamentals = new Fundamentals({
      OperatingCashFlow: { raw: 100000000 },
      CapitalExpenditure: { raw: 10000000 },
      CashDividendsPaid: { raw: 15000000 },
      NetIncome: { raw: 80000000 },
      payoutRatio: { raw: 0.15 }
    });

    const mockScores = new DividendScores({
      payout: 90,
      fcf: 75,
      streak: 85,
      growth: 70
    });

    const mockAnalysis = new DividendAnalysis({
      ticker: 'AAPL',
      quote: mockQuote,
      ttmDividends: 1.00,
      ttmYield: 0.44,
      annualDividends: [[2023, 0.96], [2024, 1.00]],
      cagr3: 0.02,
      cagr5: 0.08,
      streak: 13,
      fundamentals: mockFundamentals,
      safeGrowth: 0.03,
      forwardDividend: 1.03,
      forwardYield: 0.46,
      scores: mockScores,
      totalScore: 80
    });

    // Save to database
    console.log('💾 Saving mock analysis...');
    const analysisId = await DatabaseService.saveAnalysis(mockAnalysis, {
      requiredReturn: 0.09,
      years: 15
    });
    
    console.log(`✅ Analysis saved successfully! ID: ${analysisId}`);
    
    // Test retrieving history
    console.log('📊 Testing history retrieval...');
    const history = await DatabaseService.getAnalysisHistory('AAPL', 5);
    console.log(`✅ Retrieved ${history.length} historical records`);
    
    // Test leaderboard
    console.log('🏆 Testing leaderboard...');
    await DatabaseService.refreshLeaderboard();
    const leaderboard = await DatabaseService.getLeaderboard(new Date(), 5);
    console.log(`✅ Retrieved ${leaderboard.length} leaderboard entries`);
    
    if (leaderboard.length > 0) {
      console.log('\n📈 Current leaderboard:');
      leaderboard.forEach(entry => {
        console.log(`   ${entry.rank}. ${entry.symbol} - Score: ${entry.score}, Yield: ${(entry.forward_yield * 100).toFixed(2)}%`);
      });
    }
    
    console.log('\n✅ Database save functionality is working perfectly!');
    
  } catch (error) {
    console.error('❌ Database save test failed:', error.message);
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n💡 Schema not set up. Please run the SQL script from schema-setup.sql');
      console.error('   in your Supabase dashboard SQL editor.');
    }
    
    process.exit(1);
  }
}

testDatabaseSave();