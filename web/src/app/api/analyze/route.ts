import { DividendAnalysisService } from '@/src/services/DividendAnalysisService';
import { AlphaVantageService } from '@/src/services/AlphaVantageService';
import { YahooFinanceService } from '@/src/services/YahooFinanceService';
import { FallbackDataProvider } from '@/src/services/FallbackDataProvider';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
  }

  try {
    const alphaVantageService = new AlphaVantageService(process.env.ALPHA_VANTAGE_API_KEY || '');
    const yahooFinanceService = new YahooFinanceService();
    const fallbackDataProvider = new FallbackDataProvider(alphaVantageService, yahooFinanceService);

    const analysisService = new DividendAnalysisService(fallbackDataProvider);

    const analysis = await analysisService.analyze(ticker);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
