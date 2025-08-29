import type { AnnualDividendData } from '../models/DividendAnalysis.js';
export declare const clamp: (x: number, lo: number, hi: number) => number;
export declare const sum: (arr: number[]) => number;
export declare const isValidNumber: (value: unknown) => value is number;
export declare const calculateCAGR: (series: AnnualDividendData[]) => number | null;
