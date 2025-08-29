import { ValidationError, ConfigurationError } from '../errors/DivvyErrors.js';

export class InputValidator {
  private static readonly TICKER_PATTERN = /^[A-Z0-9.-]{1,10}$/;
  private static readonly MIN_YEARS = 1;
  private static readonly MAX_YEARS = 50;
  private static readonly MIN_REQUIRED_RETURN = 0.001; // 0.1%
  private static readonly MAX_REQUIRED_RETURN = 1.0;   // 100%
  private static readonly VALID_PROVIDERS = ['yahoo', 'av', 'auto'];
  
  static validateTicker(ticker: string): string {
    if (!ticker) {
      throw new ValidationError('Ticker symbol is required', 'ticker');
    }
    
    if (typeof ticker !== 'string') {
      throw new ValidationError('Ticker must be a string', 'ticker');
    }
    
    const cleanTicker = ticker.trim().toUpperCase();
    
    if (cleanTicker.length === 0) {
      throw new ValidationError('Ticker symbol cannot be empty', 'ticker');
    }
    
    if (cleanTicker.length > 10) {
      throw new ValidationError('Ticker symbol too long (max 10 characters)', 'ticker');
    }
    
    if (!this.TICKER_PATTERN.test(cleanTicker)) {
      throw new ValidationError(
        'Invalid ticker format. Use only letters, numbers, dots, and hyphens', 
        'ticker'
      );
    }
    
    // Check for common invalid patterns
    if (cleanTicker.startsWith('-') || cleanTicker.endsWith('-')) {
      throw new ValidationError('Ticker cannot start or end with hyphen', 'ticker');
    }
    
    if (cleanTicker.startsWith('.') || cleanTicker.endsWith('.')) {
      throw new ValidationError('Ticker cannot start or end with dot', 'ticker');
    }
    
    return cleanTicker;
  }
  
  static validateYears(years: string | number): number {
    let numYears: number;
    
    if (typeof years === 'string') {
      numYears = parseInt(years, 10);
      if (isNaN(numYears)) {
        throw new ValidationError('Years must be a valid number', 'years');
      }
    } else {
      numYears = years;
    }
    
    if (!Number.isInteger(numYears)) {
      throw new ValidationError('Years must be a whole number', 'years');
    }
    
    if (numYears < this.MIN_YEARS) {
      throw new ValidationError(
        `Years must be at least ${this.MIN_YEARS}`, 
        'years'
      );
    }
    
    if (numYears > this.MAX_YEARS) {
      throw new ValidationError(
        `Years cannot exceed ${this.MAX_YEARS}`, 
        'years'
      );
    }
    
    return numYears;
  }
  
  static validateRequiredReturn(requiredReturn: string | number): number {
    let numReturn: number;
    
    if (typeof requiredReturn === 'string') {
      numReturn = parseFloat(requiredReturn);
      if (isNaN(numReturn)) {
        throw new ValidationError('Required return must be a valid number', 'requiredReturn');
      }
    } else {
      numReturn = requiredReturn;
    }
    
    if (!isFinite(numReturn)) {
      throw new ValidationError('Required return must be a finite number', 'requiredReturn');
    }
    
    if (numReturn < this.MIN_REQUIRED_RETURN) {
      throw new ValidationError(
        `Required return too low (minimum ${(this.MIN_REQUIRED_RETURN * 100).toFixed(1)}%)`,
        'requiredReturn'
      );
    }
    
    if (numReturn > this.MAX_REQUIRED_RETURN) {
      throw new ValidationError(
        `Required return too high (maximum ${(this.MAX_REQUIRED_RETURN * 100)}%)`,
        'requiredReturn'
      );
    }
    
    return numReturn;
  }
  
  static validateProvider(provider: string): string {
    if (!provider) {
      throw new ValidationError('Provider is required', 'provider');
    }
    
    if (typeof provider !== 'string') {
      throw new ValidationError('Provider must be a string', 'provider');
    }
    
    const cleanProvider = provider.trim().toLowerCase();
    
    if (!this.VALID_PROVIDERS.includes(cleanProvider)) {
      throw new ValidationError(
        `Invalid provider "${provider}". Valid providers: ${this.VALID_PROVIDERS.join(', ')}`, 
        'provider'
      );
    }
    
    return cleanProvider;
  }
  
  static validateCommanderOptions(options: any): void {
    if (!options || typeof options !== 'object') {
      throw new ConfigurationError('Invalid command options');
    }
    
    // Validate years if provided
    if (options.years !== undefined) {
      try {
        this.validateYears(options.years);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`Invalid --years parameter: ${error.message}`, 'years');
        }
        throw error;
      }
    }
    
    // Validate required return if provided
    if (options.r !== undefined) {
      try {
        this.validateRequiredReturn(options.r);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`Invalid --r parameter: ${error.message}`, 'requiredReturn');
        }
        throw error;
      }
    }
    
    // Validate provider if provided
    if (options.provider !== undefined) {
      try {
        this.validateProvider(options.provider);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`Invalid --provider parameter: ${error.message}`, 'provider');
        }
        throw error;
      }
    }
  }
  
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }
    
    // Remove potentially dangerous characters
    return input
      .trim()
      .replace(/[<>'"&]/g, '') // Remove HTML/script injection characters
      .slice(0, 50); // Limit length
  }
}