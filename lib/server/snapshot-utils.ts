import type { DebtInstrument, HouseholdSnapshot } from "@/lib/rae/types";

export type HouseholdSnapshotRow = {
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
  currency?: string;
  region?: string;
};

export type DebtSnapshotRow = {
  id: string;
  label: string | null;
  lender: string | null;
  debt_type: DebtInstrument["type"];
  balance: number;
  apr: number;
  min_payment: number;
  is_active: boolean;
};

export function deriveShockProbability(monthlyIncome: number, incomeVolatility: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.max(0, Math.min((incomeVolatility / monthlyIncome) * 2, 1));
}

export function mapDebtRowsToInstruments(debtRows: DebtSnapshotRow[]): DebtInstrument[] {
  return debtRows.map((debt) => ({
    id: debt.id,
    label: debt.label ?? undefined,
    lender: debt.lender,
    type: debt.debt_type,
    balance: debt.balance,
    apr: debt.apr,
    minPayment: debt.min_payment,
    isActive: debt.is_active,
  }));
}

export function buildHouseholdSnapshot(
  household: HouseholdSnapshotRow,
  debtRows: DebtSnapshotRow[],
): HouseholdSnapshot {
  return {
    monthlyIncome: household.monthly_income,
    incomeVolatility: household.income_volatility,
    fixedObligations: household.fixed_obligations,
    bufferBalance: household.buffer_balance,
    planCommitmentScore: household.plan_commitment_score,
    incomeShockProbability: deriveShockProbability(
      household.monthly_income,
      household.income_volatility,
    ),
    debts: mapDebtRowsToInstruments(debtRows),
    currency: household.currency ?? "GBP",
    region: household.region ?? "GB",
  };
}
