import type { AnnualDividendData } from '../models/DividendAnalysis.js';

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + (b || 0), 0);

export const isValidNumber = (value: unknown): value is number => value != null && isFinite(value as number);

export const calculateCAGR = (series: AnnualDividendData[]): number | null => {
  const vals = series.filter(([, v]) => v > 0);
  if (vals.length < 2) return null;
  
  const first = vals[0];
  const last = vals[vals.length - 1];
  const years = last[0] - first[0] || 1;
  
  if (years < 2 || first[1] <= 0) return null;
  
  return Math.pow(last[1] / first[1], 1 / years) - 1;
};