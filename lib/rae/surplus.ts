import type { HouseholdSnapshot } from "./engine-types";

export interface SurplusResult {
  surplus: number; // pence
  obligationStress: boolean;
}

/**
 * Computes discretionary surplus:
 * S = monthlyIncome - fixedObligations - SUM(active debt minPayment)
 */
export function computeSurplus(snapshot: HouseholdSnapshot): SurplusResult {
  const activeDebtMinimums = snapshot.debts
    .filter((debt) => debt.isActive)
    .reduce((sum, debt) => sum + debt.minPayment, 0);

  const surplus = snapshot.monthlyIncome - snapshot.fixedObligations - activeDebtMinimums;

  return {
    surplus,
    obligationStress: surplus <= 0,
  };
}

