import { Command } from "commander";
import { DividendAnalysisService } from "../services/DividendAnalysisService.js";
import { DividendCalculator } from "../calculators/DividendCalculator.js";
import { OutputFormatter } from "../formatters/OutputFormatter.js";
export class DivvyCliApp {
    analysisService;
    program;
    constructor() {
        this.analysisService = new DividendAnalysisService();
        this.program = new Command();
        this.setupCommander();
    }
    setupCommander() {
        this.program
            .name("divvy")
            .description("Estimate dividend yield potential for a stock (free data).")
            .argument("<ticker>", "Stock ticker symbol, e.g. AAPL")
            .option("-y, --years <n>", "Years of dividend history to fetch", "15")
            .option("--r <pct>", "Required return for optional DDM output (e.g. 0.09)", "0.09");
    }
    parseArguments() {
        this.program.parse(process.argv);
        const options = this.program.opts();
        const ticker = this.program.args[0].toUpperCase();
        const years = Math.max(3, parseInt(options.years, 10) || 15);
        const requiredReturn = Math.max(0.01, Math.min(0.25, parseFloat(options.r) || 0.09));
        return { ticker, years, requiredReturn };
    }
    async run() {
        try {
            const { ticker, years, requiredReturn } = this.parseArguments();
            const analysis = await this.analysisService.analyze(ticker, years, requiredReturn);
            OutputFormatter.formatDividendAnalysis(analysis, requiredReturn);
            const ddmPrice = DividendCalculator.calculateGordonGrowthModel(analysis.forwardDividend, analysis.quote.price, requiredReturn, analysis.safeGrowth);
            if (ddmPrice) {
                OutputFormatter.formatGordonGrowthModel(ddmPrice, analysis.quote.price, requiredReturn, analysis.safeGrowth);
            }
            OutputFormatter.formatFooter();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error("Error:", errorMessage);
            process.exit(1);
        }
    }
}
