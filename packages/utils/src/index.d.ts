/**
 * Formats a number as a percentage with specified decimal places
 */
export declare function formatPercent(value: number, decimals?: number): string;
/**
 * Formats a number as currency (USD)
 */
export declare function formatCurrency(value: number, decimals?: number): string;
/**
 * Safely clamps a number between min and max values
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Delays execution for specified milliseconds
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Checks if a value is a finite number
 */
export declare function isValidNumber(value: any): value is number;
/**
 * Creates a debounced function
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
