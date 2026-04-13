import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Money formatting ──────────────────────────────────────────────────────
// Canonical display-layer formatter. All pence values divide here.
// Used across dashboard pages, PDFs, and form components.
export function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
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
