#!/usr/bin/env node

/**
 * Leaderboard Refresh Script
 * 
 * Refreshes the materialized view for daily dividend analysis leaderboards.
 * Can be run manually or via cron job.
 * 
 * Usage:
 *   npm run refresh-leaderboard
 *   node scripts/refresh-leaderboard.js
 *   
 * Environment:
 *   Requires SUPABASE_URL and SUPABASE_ANON_KEY in .env file
 */

import { config } from 'dotenv';
import { DatabaseService } from '../src/services/DatabaseService.js';

// Load environment variables
config();

async function main() {
  try {
    console.log('🔄 Refreshing leaderboard...');
    const startTime = Date.now();
    
    await DatabaseService.refreshLeaderboard();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Leaderboard refreshed successfully in ${duration}ms`);
    
    // Show sample of updated leaderboard
    console.log('\n📊 Top 10 current leaders:');
    const leaders = await DatabaseService.getLeaderboard(new Date(), 10);
    
    if (leaders.length === 0) {
      console.log('   No data available');
    } else {
      console.log('   Rank | Symbol | Score | Fwd Yield');
      console.log('   -----|--------|-------|----------');
      leaders.forEach(leader => {
        const yield_ = leader.forward_yield ? `${(leader.forward_yield * 100).toFixed(2)}%` : 'N/A';
        console.log(`   ${leader.rank.toString().padStart(4)} | ${leader.symbol.padEnd(6)} | ${leader.score.toString().padStart(5)} | ${yield_.padStart(8)}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to refresh leaderboard:', error.message);
    
    if (error.message.includes('SUPABASE')) {
      console.error('\n💡 Make sure your .env file contains:');
      console.error('   SUPABASE_URL=your_supabase_url');
      console.error('   SUPABASE_ANON_KEY=your_anon_key');
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error.message);
  process.exit(1);
});

main();