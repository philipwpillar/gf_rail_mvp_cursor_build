/**
 * lib/display/money.ts
 *
 * Canonical currency-aware money formatter for the Rail display layer.
 *
 * All monetary display in Rail — components, charts, PDFs, AI context —
 * routes through formatMoney(). This is the single place to extend when
 * a new currency or locale is added.
 *
 * Rule: this file must have zero database or network imports. Pure functions only.
 * Rule: all monetary values entering this file are integers in pence (or cents).
 */

/** Supported currency codes. Extend this union when a new region is added. */
export type SupportedCurrency = "GBP" | "USD";

/** Returns the display symbol for a given currency code. */
export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case "USD":
      return "$";
    case "GBP":
    default:
      return "£";
  }
}

/**
 * Formats an integer pence/cents value as a human-readable currency string.
 * Examples:
 *   formatMoney(12345, 'GBP') → '£123.45'
 *   formatMoney(12345, 'USD') → '$123.45'
 *   formatMoney(12345, 'GBP', { decimals: 0 }) → '£123'
 */
export function formatMoney(
  pence: number,
  currency: string,
  options: { decimals?: number } = {},
): string {
  const decimals = options.decimals ?? 2;
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${(pence / 100).toFixed(decimals)}`;
}
