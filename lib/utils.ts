import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatMoney } from '@/lib/display/money';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Money formatting ──────────────────────────────────────────────────────
// formatPounds is the backward-compatible GBP wrapper around formatMoney.
// All existing callers of formatPounds continue to work unchanged.
// New code should call formatMoney(pence, currency) directly.
export function formatPounds(pence: number): string {
  return formatMoney(pence, 'GBP');
}

// ─── Form input parsers ────────────────────────────────────────────────────
// Used by onboarding and settings to convert £ string inputs → pence integers.
export function poundsStringToPence(str: string): number {
  return Math.round(parseFloat(str) * 100);
}

// Converts "34.9" → 0.349. Used for APR inputs.
export function aprStringToDecimal(str: string): number {
  return parseFloat(str) / 100;
}

// ─── Form validators ───────────────────────────────────────────────────────
export function isPositiveNumber(str: string): boolean {
  const n = parseFloat(str);
  return !isNaN(n) && n > 0;
}

export function isNonNegativeNumber(str: string): boolean {
  const n = parseFloat(str);
  return !isNaN(n) && n >= 0;
}
