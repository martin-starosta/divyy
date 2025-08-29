import { Command } from "commander";
import { DividendAnalysisService } from "../services/DividendAnalysisService.js";
import { DividendCalculator } from "../calculators/DividendCalculator.js";
import { OutputFormatter } from "../formatters/OutputFormatter.js";
import { ErrorFormatter } from "../formatters/ErrorFormatter.js";
import { InputValidator } from "../validation/InputValidator.js";
import { FallbackDataProvider } from "../services/FallbackDataProvider.js";
import { DivvyError, ValidationError } from "../errors/DivvyErrors.js";

interface ParsedArguments {
  ticker: string;
  years: number;
  requiredReturn: number;
}

export class DivvyCliApp {
  private readonly analysisService: DividendAnalysisService;
  private readonly program: Command;

  constructor() {
    this.analysisService = new DividendAnalysisService();
    this.program = new Command();
    this.setupCommander();
  }

  private setupCommander(): void {
    this.program
      .name("divvy")
      .description("Estimate dividend yield potential for a stock (free data).")
      .argument("<ticker>", "Stock ticker symbol, e.g. AAPL")
      .option("-y, --years <n>", "Years of dividend history to fetch", "15")
      .option("--r <pct>", "Required return for optional DDM output (e.g. 0.09)", "0.09")
      .option("--verbose", "Show detailed data quality information")
      .option("--no-warnings", "Suppress warning messages")
      .version("1.0.0")
      .helpOption("-h, --help", "Display help for command");
  }

  private parseArguments(): ParsedArguments {
    this.program.parse(process.argv);
    
    const options = this.program.opts();
    
    // Validate arguments exist
    if (this.program.args.length === 0) {
      throw new ValidationError('Ticker symbol is required. Usage: divvy <TICKER>', 'ticker');
    }
    
    // Validate ticker
    const ticker = InputValidator.validateTicker(this.program.args[0]);
    
    // Validate years
    const years = InputValidator.validateYears(options.years);
    
    // Validate required return
    const requiredReturn = InputValidator.validateRequiredReturn(options.r);
    
    // Validate all options together
    InputValidator.validateCommanderOptions(options);

    return { ticker, years, requiredReturn };
  }

  async run(): Promise<void> {
    try {
      // Health check (optional)
      if (process.env.NODE_ENV !== 'production') {
        const healthCheck = await this.analysisService.healthCheck();
        if (!healthCheck.available && healthCheck.error) {
          console.warn(`⚠️  Data source warning: ${healthCheck.error}`);
          console.warn('   Analysis will proceed but may have limited data.\n');
        }
      }
      
      const { ticker, years, requiredReturn } = this.parseArguments();
      const options = this.program.opts();
      
      // Show progress for long operations
      if (!options.quiet) {
        console.log(`🔍 Analyzing ${ticker}... (${years} years of data)`);
      }
      
      const analysis = await this.analysisService.analyze(ticker, years, requiredReturn);
      
      // Show data quality warnings if enabled
      if (!options.noWarnings) {
        const warnings = await this.gatherWarnings(analysis);
        if (warnings.length > 0) {
          console.log(ErrorFormatter.formatWarnings(warnings));
        }
      }
      
      // Show verbose data quality information
      if (options.verbose) {
        const qualityReport = FallbackDataProvider.assessDataQuality(
          true, // has price (we got this far)
          analysis.annualDividends.length,
          this.countFundamentalFields(analysis.fundamentals),
          5 // total fundamental fields
        );
        
        console.log(ErrorFormatter.formatDataQualityReport(
          qualityReport.score,
          qualityReport.level,
          qualityReport.recommendations
        ));
      }
      
      // Display main analysis
      OutputFormatter.formatDividendAnalysis(analysis, requiredReturn);
      
      // Display Gordon Growth Model if applicable
      const ddmPrice = DividendCalculator.calculateGordonGrowthModel(
        analysis.forwardDividend,
        analysis.quote.price,
        requiredReturn,
        analysis.safeGrowth
      );
      
      if (ddmPrice) {
        OutputFormatter.formatGordonGrowthModel(ddmPrice, analysis.quote.price, requiredReturn, analysis.safeGrowth);
      }
      
      OutputFormatter.formatFooter();
      
      // Exit successfully
      process.exit(0);
      
    } catch (error) {
      await this.handleError(error);
    }
  }
  
  private async handleError(error: unknown): Promise<void> {
    const err = error instanceof Error ? error : new Error('Unknown error occurred');
    
    // Format and display the error
    const formattedError = ErrorFormatter.formatError(err);
    console.error(formattedError);
    
    // For debugging in development
    if (process.env.NODE_ENV === 'development' && err.stack) {
      console.error('\nStack Trace:', err.stack);
    }
    
    // Set appropriate exit code
    let exitCode = 1;
    
    if (err instanceof ValidationError) {
      exitCode = 2; // Invalid input
    } else if (err instanceof DivvyError && !err.isRetryable) {
      exitCode = 3; // Permanent failure
    }
    // Network/retry errors use default exit code 1
    
    process.exit(exitCode);
  }
  
  private async gatherWarnings(analysis: any): Promise<string[]> {
    const warnings: string[] = [];
    
    // Check for data completeness
    if (analysis.annualDividends.length < 5) {
      warnings.push('Limited dividend history may affect accuracy');
    }
    
    if (!isFinite(analysis.fundamentals.epsPayoutRatio)) {
      warnings.push('EPS payout ratio unavailable - using estimates');
    }
    
    if (!isFinite(analysis.fundamentals.fcfCoverage)) {
      warnings.push('Free cash flow data unavailable - using estimates');
    }
    
    // Check for unusual values
    if (analysis.streak === 0 && analysis.ttmDividends > 0) {
      warnings.push('Recent dividend cut detected');
    }
    
    if (analysis.totalScore < 30) {
      warnings.push('Low dividend sustainability score - exercise caution');
    }
    
    return warnings;
  }
  
  private countFundamentalFields(fundamentals: any): number {
    let count = 0;
    if (isFinite(fundamentals.operatingCashFlow)) count++;
    if (isFinite(fundamentals.capitalExpenditure)) count++;
    if (isFinite(fundamentals.cashDividendsPaid)) count++;
    if (isFinite(fundamentals.netIncome)) count++;
    if (isFinite(fundamentals.epsPayoutRatio)) count++;
    return count;
  }
}