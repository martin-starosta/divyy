#!/usr/bin/env node

/**
 * Test script to demonstrate various error handling scenarios
 * Run with: tsx src/test/ErrorScenarios.ts
 */

import { DivvyCliApp } from '../cli/DivvyCliApp.js';
import { InputValidator } from '../validation/InputValidator.js';
import { ErrorFormatter } from '../formatters/ErrorFormatter.js';
import { ValidationError, TickerNotFoundError, InsufficientDataError } from '../errors/DivvyErrors.js';

interface TestScenario {
  name: string;
  test: () => Promise<void> | void;
  expectedError?: string;
}

class ErrorScenarioTester {
  private scenarios: TestScenario[] = [
    {
      name: "Empty ticker validation",
      test: () => {
        try {
          InputValidator.validateTicker("");
        } catch (error) {
          console.log("✅ Caught expected error:", (error as Error).message);
        }
      }
    },
    {
      name: "Invalid ticker format",
      test: () => {
        try {
          InputValidator.validateTicker("INVALID$TICKER@");
        } catch (error) {
          console.log("✅ Caught expected error:", (error as Error).message);
        }
      }
    },
    {
      name: "Invalid years parameter",
      test: () => {
        try {
          InputValidator.validateYears("abc");
        } catch (error) {
          console.log("✅ Caught expected error:", (error as Error).message);
        }
      }
    },
    {
      name: "Years out of range",
      test: () => {
        try {
          InputValidator.validateYears(100);
        } catch (error) {
          console.log("✅ Caught expected error:", (error as Error).message);
        }
      }
    },
    {
      name: "Invalid required return",
      test: () => {
        try {
          InputValidator.validateRequiredReturn("2.5"); // 250%
        } catch (error) {
          console.log("✅ Caught expected error:", (error as Error).message);
        }
      }
    },
    {
      name: "Error formatting - Validation Error",
      test: () => {
        const error = new ValidationError("Invalid ticker format", "ticker");
        const formatted = ErrorFormatter.formatError(error);
        console.log("✅ Formatted validation error:");
        console.log(formatted);
      }
    },
    {
      name: "Error formatting - Ticker Not Found",
      test: () => {
        const error = new TickerNotFoundError("FAKESTK");
        const formatted = ErrorFormatter.formatError(error);
        console.log("✅ Formatted ticker not found error:");
        console.log(formatted);
      }
    },
    {
      name: "Error formatting - Insufficient Data",
      test: () => {
        const error = new InsufficientDataError(["dividend history", "financial statements"]);
        const formatted = ErrorFormatter.formatError(error);
        console.log("✅ Formatted insufficient data error:");
        console.log(formatted);
      }
    },
    {
      name: "CLI validation - No arguments",
      test: async () => {
        // Mock process.argv to simulate no arguments
        const originalArgv = process.argv;
        try {
          process.argv = ['node', 'divvy']; // No ticker argument
          
          const app = new DivvyCliApp();
          await app.run();
        } catch (error) {
          console.log("✅ CLI properly caught missing ticker:", (error as Error).message);
        } finally {
          process.argv = originalArgv;
        }
      }
    },
    {
      name: "Data quality warnings",
      test: () => {
        const warnings = [
          "Limited dividend history may affect accuracy",
          "EPS payout ratio unavailable - using estimates"
        ];
        const formatted = ErrorFormatter.formatWarnings(warnings);
        console.log("✅ Formatted warnings:");
        console.log(formatted);
      }
    }
  ];

  async runAll(): Promise<void> {
    console.log("🧪 Running Error Handling Test Scenarios\n");
    console.log("=" .repeat(50));

    for (let i = 0; i < this.scenarios.length; i++) {
      const scenario = this.scenarios[i];
      console.log(`\n${i + 1}. Testing: ${scenario.name}`);
      console.log("-".repeat(40));

      try {
        await scenario.test();
      } catch (error) {
        console.log("❌ Unexpected error in test:", (error as Error).message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Error handling tests completed!");
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ErrorScenarioTester();
  tester.runAll().catch(console.error);
}