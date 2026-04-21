import { PipelineStage, type HouseholdSnapshot } from "./types";
import type { RailPolicy } from "./policy/types";

const WEEKS_PER_MONTH = 4.33;

function sumActiveDebtMinimums(snapshot: HouseholdSnapshot): number {
  return snapshot.debts
    .filter((debt) => debt.isActive)
    .reduce((sum, debt) => sum + debt.minPayment, 0);
}

function computeWeeklyObligations(snapshot: HouseholdSnapshot): number {
  const totalObligations = snapshot.fixedObligations + sumActiveDebtMinimums(snapshot);
  return totalObligations / WEEKS_PER_MONTH;
}

/**
 * B_min = ((fixedObligations + SUM(active minPayment)) / 4.33) * policy.bMinWeeks
 */
export function computeBMin(snapshot: HouseholdSnapshot, policy: RailPolicy): number {
  return Math.round(computeWeeklyObligations(snapshot) * policy.bMinWeeks);
}

/**
 * B_target = ((fixedObligations + SUM(active minPayment)) / 4.33) * policy.bTargetWeeks
 */
export function computeBTarget(snapshot: HouseholdSnapshot, policy: RailPolicy): number {
  return Math.round(computeWeeklyObligations(snapshot) * policy.bTargetWeeks);
}

/**
 * Stage rules:
 * 1) If buffer < B_min => Stage 1 (Resilience)
 * 2) Else if any active debt APR > policy.aprThreshold => Stage 2 (Debt)
 * 3) Else => Stage 3 (Ownership)
 */
export function classifyStage(
  snapshot: HouseholdSnapshot,
  bMin: number,
  policy: RailPolicy,
): PipelineStage {
  if (snapshot.bufferBalance < bMin) {
    return PipelineStage.STAGE_1_RESILIENCE;
  }

  const hasHighAprActiveDebt = snapshot.debts.some(
    (debt) => debt.isActive && debt.apr > policy.aprThreshold,
  );

  if (hasHighAprActiveDebt) {
    return PipelineStage.STAGE_2_DEBT;
  }

  return PipelineStage.STAGE_3_OWNERSHIP;
}

