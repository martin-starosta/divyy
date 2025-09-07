// Common utility functions for the monorepo
/**
 * Formats a number as a percentage with specified decimal places
 */
export function formatPercent(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
}
/**
 * Formats a number as currency (USD)
 */
export function formatCurrency(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}
/**
 * Safely clamps a number between min and max values
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
/**
 * Delays execution for specified milliseconds
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Checks if a value is a finite number
 */
export function isValidNumber(value) {
    return typeof value === 'number' && isFinite(value);
}
/**
 * Creates a debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
