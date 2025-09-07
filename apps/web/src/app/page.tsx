"use client";

import { useState } from "react";

type AnalysisResult = {
  ticker: string;
  score: number;
  [key: string]: string | number | boolean | null | undefined | object;
};

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!ticker) {
      setError("Please enter a stock ticker.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch(`/api/analyze?ticker=${ticker}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch analysis.");
      }
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8 text-center w-full">Divvy Dividend Analyzer</h1>
      </div>

      <div className="mb-8 w-full max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter stock ticker (e.g., AAPL)"
            className="flex-grow p-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600"
          >
            {isLoading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-400 bg-red-900/50 p-4 rounded-md w-full max-w-md text-center">
          <p>Error: {error}</p>
        </div>
      )}

      {analysis && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg w-full max-w-md animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Analysis for {analysis.ticker}
          </h2>
          <div className="space-y-2">
            {Object.entries(analysis).map(([key, value]) => (
              <div key={key} className="flex justify-between p-2 bg-gray-700 rounded-md">
                <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}</span>
                <span>{typeof value === 'number' ? value.toFixed(2) : typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}