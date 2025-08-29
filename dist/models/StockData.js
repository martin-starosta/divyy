export class Quote {
    price;
    currency;
    name;
    constructor({ regularMarketPrice, postMarketPrice, preMarketPrice, currency, shortName, longName }) {
        this.price = regularMarketPrice || postMarketPrice || preMarketPrice || 0;
        this.currency = currency || "USD";
        this.name = shortName || longName || "";
    }
}
export class DividendEvent {
    date;
    amount;
    constructor({ date, amount }) {
        this.date = new Date(typeof date === 'number' ? date * 1000 : date);
        this.amount = Number(amount);
    }
    get year() {
        return this.date.getUTCFullYear();
    }
    isValid() {
        return (this.amount > 0 &&
            isFinite(this.amount) &&
            this.year > 1990 &&
            this.year < 2030);
    }
}
export class Fundamentals {
    operatingCashFlow;
    capitalExpenditure;
    cashDividendsPaid;
    netIncome;
    payoutRatio;
    constructor(data = {}) {
        this.operatingCashFlow = this.extractValue(data.OperatingCashFlow);
        this.capitalExpenditure = Math.abs(this.extractValue(data.CapitalExpenditure));
        this.cashDividendsPaid = Math.abs(this.extractValue(data.CashDividendsPaid));
        this.netIncome = this.extractValue(data.NetIncome);
        this.payoutRatio = this.extractValue(data.payoutRatio);
    }
    extractValue(field) {
        if (!field)
            return NaN;
        if (typeof field === 'number')
            return field;
        return Number(field.raw ?? field);
    }
    get freeCashFlow() {
        return isFinite(this.operatingCashFlow) && isFinite(this.capitalExpenditure)
            ? this.operatingCashFlow - this.capitalExpenditure
            : NaN;
    }
    get fcfPayoutRatio() {
        const fcf = this.freeCashFlow;
        return isFinite(this.cashDividendsPaid) && isFinite(fcf) && fcf !== 0
            ? this.cashDividendsPaid / fcf
            : NaN;
    }
    get fcfCoverage() {
        const fcf = this.freeCashFlow;
        return isFinite(this.cashDividendsPaid) && isFinite(fcf) && this.cashDividendsPaid > 0
            ? fcf / this.cashDividendsPaid
            : (this.cashDividendsPaid === 0 ? Infinity : NaN);
    }
    get epsPayoutRatio() {
        if (isFinite(this.payoutRatio))
            return this.payoutRatio;
        if (isFinite(this.cashDividendsPaid) && isFinite(this.netIncome) && this.netIncome !== 0) {
            return this.cashDividendsPaid / Math.abs(this.netIncome);
        }
        return NaN;
    }
}
