const MIN_SURPLUS_DELTA_PENCE = -30_000;
const MAX_SURPLUS_DELTA_PENCE = 50_000;

export function clampSurplusDeltaPence(value: number): number {
  return Math.max(MIN_SURPLUS_DELTA_PENCE, Math.min(MAX_SURPLUS_DELTA_PENCE, value));
}

export function parseSurplusDeltaCookie(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 0;
  return clampSurplusDeltaPence(parsed);
}

export function applySurplusDelta(monthlyIncome: number, surplusDeltaPence: number): number {
  return Math.max(0, monthlyIncome + clampSurplusDeltaPence(surplusDeltaPence));
}
