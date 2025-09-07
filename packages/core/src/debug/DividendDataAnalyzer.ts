#!/usr/bin/env node

/**
 * Debug tool to analyze dividend data quality issues
 * Usage: tsx src/debug/DividendDataAnalyzer.ts PG
 */

import { YahooFinanceService } from '../services/YahooFinanceService.js';
import { DividendCalculator } from '../calculators/DividendCalculator.js';
import type { DividendEvent } from '../models/StockData.js';
import type { AnnualDividendData } from '../models/DividendAnalysis.js';

class DividendDataAnalyzer {
  private yahooService = new YahooFinanceService();

  async analyzeTicker(ticker: string, years: number = 15): Promise<void> {
    console.log(`🔍 Analyzing dividend data for ${ticker}...`);
    console.log('='.repeat(60));

    try {
      // Get raw dividend events
      const dividendEvents = await this.yahooService.getDividendEvents(ticker, years);
      console.log(`\n📊 Found ${dividendEvents.length} dividend events over ${years} years`);

      // Show recent raw events
      console.log('\n🔴 Recent Raw Dividend Events:');
      console.log('Date                Amount    Year');
      console.log('-'.repeat(35));
      
      const recentEvents = dividendEvents
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 20);
        
      for (const event of recentEvents) {
        console.log(`${event.date.toISOString().split('T')[0]}      $${event.amount.toFixed(4)}    ${event.year}`);
      }

      // Annualize the data
      const annualData = DividendCalculator.annualizeDividends(dividendEvents);
      console.log(`\n🟢 Annual Dividend Totals (${annualData.length} years):`);
      console.log('Year    Amount    Change    % Change');
      console.log('-'.repeat(40));

      for (let i = 0; i < annualData.length; i++) {
        const [year, amount] = annualData[i];
        let changeStr = '    -    ';
        let pctChangeStr = '   -   ';
        
        if (i > 0) {
          const prevAmount = annualData[i - 1][1];
          const change = amount - prevAmount;
          const pctChange = ((amount / prevAmount) - 1) * 100;
          
          changeStr = change >= 0 
            ? `+$${change.toFixed(4)}` 
            : `-$${Math.abs(change).toFixed(4)}`;
          pctChangeStr = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`;
        }
        
        console.log(`${year}   $${amount.toFixed(4)}   ${changeStr.padStart(8)}  ${pctChangeStr.padStart(7)}`);
      }

      // Test current streak calculation
      const currentStreak = DividendCalculator.calculateDividendStreak(annualData);
      console.log(`\n❌ Current Algorithm Result: ${currentStreak} year streak`);

      // Analyze why streak is low
      console.log('\n🔍 Streak Analysis (working backwards):');
      this.analyzeStreak(annualData);

      // Test with different tolerances
      console.log('\n🧪 Testing Different Tolerance Levels:');
      this.testTolerances(annualData);

      // Look for data quality issues
      console.log('\n⚠️  Data Quality Issues:');
      this.identifyDataIssues(dividendEvents, annualData);

    } catch (error) {
      console.error('❌ Error analyzing ticker:', error);
    }
  }

  private analyzeStreak(annualData: AnnualDividendData[]): void {
    const sorted = annualData.slice().sort((a, b) => a[0] - b[0]);
    
    for (let i = sorted.length - 1; i > 0; i--) {
      const [currentYear, currentAmount] = sorted[i];
      const [previousYear, previousAmount] = sorted[i - 1];
      
      // const change = currentAmount - previousAmount; // Unused for now
      const pctChange = ((currentAmount / previousAmount) - 1) * 100;
      const passes999 = currentAmount >= previousAmount * 0.999;
      const passes995 = currentAmount >= previousAmount * 0.995;
      
      console.log(
        `${currentYear} vs ${previousYear}: ` +
        `$${currentAmount.toFixed(4)} vs $${previousAmount.toFixed(4)} ` +
        `(${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%) ` +
        `[99.9%: ${passes999 ? '✅' : '❌'}] [99.5%: ${passes995 ? '✅' : '❌'}]`
      );
      
      if (!passes999) {
        console.log(`   ⛔ Streak broken here with current algorithm`);
        break;
      }
    }
  }

  private testTolerances(annualData: AnnualDividendData[]): void {
    const tolerances = [0.999, 0.995, 0.99, 0.985, 0.98, 0.95];
    
    for (const tolerance of tolerances) {
      const streak = this.calculateStreakWithTolerance(annualData, tolerance);
      const pct = ((1 - tolerance) * 100).toFixed(1);
      console.log(`Tolerance ${pct}% decline: ${streak} year streak`);
    }
  }

  private calculateStreakWithTolerance(annualSeries: AnnualDividendData[], tolerance: number): number {
    const sorted = annualSeries.slice().sort((a, b) => a[0] - b[0]);
    let streak = 0;
    
    for (let i = sorted.length - 1; i > 0; i--) {
      const current = sorted[i][1];
      const previous = sorted[i - 1][1];
      
      if (current >= previous * tolerance) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private identifyDataIssues(events: DividendEvent[], annualData: AnnualDividendData[]): void {
    const issues: string[] = [];

    // Check for years with unusually many or few events
    const eventsByYear = new Map<number, number>();
    for (const event of events) {
      eventsByYear.set(event.year, (eventsByYear.get(event.year) || 0) + 1);
    }

    for (const [year, count] of eventsByYear) {
      if (count > 6) {
        issues.push(`${year}: ${count} dividend events (unusual, may include specials)`);
      } else if (count < 4 && year < new Date().getFullYear()) {
        issues.push(`${year}: Only ${count} dividend events (incomplete data?)`);
      }
    }

    // Check for suspicious amounts
    const amounts = events.map(e => e.amount).sort((a, b) => b - a);
    const maxAmount = amounts[0];
    const medianAmount = amounts[Math.floor(amounts.length / 2)];
    
    if (maxAmount > medianAmount * 5) {
      issues.push(`Suspected special dividend: $${maxAmount.toFixed(4)} vs median $${medianAmount.toFixed(4)}`);
    }

    // Check for missing years
    const years = annualData.map(([year]) => year).sort((a, b) => a - b);
    for (let i = 1; i < years.length; i++) {
      if (years[i] - years[i-1] > 1) {
        issues.push(`Gap in data: Missing year(s) between ${years[i-1]} and ${years[i]}`);
      }
    }

    if (issues.length === 0) {
      console.log('   ✅ No obvious data quality issues detected');
    } else {
      issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const ticker = process.argv[2];
  if (!ticker) {
    console.log('Usage: tsx src/debug/DividendDataAnalyzer.ts <TICKER>');
    process.exit(1);
  }

  const analyzer = new DividendDataAnalyzer();
  analyzer.analyzeTicker(ticker).catch(console.error);
}