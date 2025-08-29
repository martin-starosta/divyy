#!/usr/bin/env node

/**
 * Test Database Connection
 * 
 * Quick test to verify Supabase connection and schema setup
 */

import { config } from 'dotenv';
import { DatabaseService } from './src/services/DatabaseService.ts';

// Load environment variables
config();

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test basic connection by trying to get leaderboard
    console.log('📊 Testing leaderboard query...');
    const leaders = await DatabaseService.getLeaderboard(new Date(), 5);
    console.log(`✅ Connection successful! Found ${leaders.length} leaderboard entries`);
    
    if (leaders.length > 0) {
      console.log('\n📈 Sample leaderboard data:');
      leaders.slice(0, 3).forEach(leader => {
        console.log(`   ${leader.rank}. ${leader.symbol} - Score: ${leader.score}`);
      });
    } else {
      console.log('📝 No analysis data found yet. Run some analyses first.');
    }
    
    console.log('\n✅ Database integration is working correctly!');
    console.log('\n💡 Usage:');
    console.log('   divvy AAPL            # Analyze and save to database (default)');
    console.log('   divvy AAPL --no-save  # Analyze without saving to database');
    console.log('   npm run refresh-leaderboard  # Update rankings');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n💡 Schema not set up. Please run the SQL script from schema-setup.sql');
      console.error('   in your Supabase dashboard SQL editor.');
    } else if (error.message.includes('Invalid API key')) {
      console.error('\n💡 Check your environment variables in .env file');
    }
    
    process.exit(1);
  }
}

testConnection();