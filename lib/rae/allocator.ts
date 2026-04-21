import {
  PipelineStage,
  type AllocationVector,
  type HouseholdSnapshot,
} from "./types";
import type { RailPolicy } from "./policy/types";

export function zeroAllocation(): AllocationVector {
  return {
    bufferContribution: 0,
    investmentContribution: 0,
    debtAllocations: [],
  };
}

function roundAndReconcile(
  target: AllocationVector,
  surplus: number,
  preferredBucket: "buffer" | "investment" | "debt",
) {
  target.bufferContribution = Math.round(target.bufferContribution);
  target.investmentContribution = Math.round(target.investmentContribution);
  target.debtAllocations = target.debtAllocations.map((d) => ({
    ...d,
    amount: Math.round(d.amount),
  }));

  const debtTotal = target.debtAllocations.reduce((sum, d) => sum + d.amount, 0);
  const total = target.bufferContribution + target.investmentContribution + debtTotal;
  const remainder = surplus - total;

  if (remainder === 0) return;

  if (preferredBucket === "debt" && target.debtAllocations.length > 0) {
    target.debtAllocations[target.debtAllocations.length - 1].amount += remainder;
    return;
  }

  if (preferredBucket === "investment") {
    target.investmentContribution += remainder;
    return;
  }

  target.bufferContribution += remainder;
}

function getActiveDebts(snapshot: HouseholdSnapshot) {
  return snapshot.debts.filter((d) => d.isActive && d.balance > 0);
}

function getHighestAprDebt(snapshot: HouseholdSnapshot) {
  const active = getActiveDebts(snapshot);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => b.apr - a.apr)[0];
}

function getSmallestBalanceDebt(snapshot: HouseholdSnapshot) {
  const active = getActiveDebts(snapshot);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => a.balance - b.balance)[0];
}

/**
 * Returns the avalanche weight for debt sequencing.
 * At or above policy.avalancheThreshold: pure avalanche (policy.avalancheWeight).
 * Below threshold: blended mode (policy.blendedAvalancheWeight).
 */
export function computeAlpha(planCommitmentScore: number, policy: RailPolicy): number {
  return planCommitmentScore >= policy.avalancheThreshold
    ? policy.avalancheWeight
    : policy.blendedAvalancheWeight;
}

export function computeBaseAllocation(
  stage: PipelineStage,
  surplus: number,
  snapshot: HouseholdSnapshot,
  bMin: number,
  bTarget: number,
  policy: RailPolicy,
): AllocationVector {
  if (surplus <= 0) {
    return zeroAllocation();
  }

  const allocation = zeroAllocation();

  if (stage === PipelineStage.STAGE_1_RESILIENCE) {
    const bufferNeeded = Math.max(0, bMin - snapshot.bufferBalance);
    allocation.bufferContribution = Math.min(surplus, bufferNeeded);

    const remaining = surplus - allocation.bufferContribution;
    if (remaining > 0) {
      const highestAprDebt = getHighestAprDebt(snapshot);
      if (highestAprDebt) {
        allocation.debtAllocations.push({ debtId: highestAprDebt.id, amount: remaining });
      } else {
        allocation.investmentContribution = remaining;
      }
    }

    roundAndReconcile(allocation, surplus, "debt");
    return allocation;
  }

  if (stage === PipelineStage.STAGE_2_DEBT) {
    const highestAprDebt = getHighestAprDebt(snapshot);
    if (!highestAprDebt) {
      allocation.investmentContribution = surplus;
      roundAndReconcile(allocation, surplus, "investment");
      return allocation;
    }

    const alpha = computeAlpha(snapshot.planCommitmentScore, policy);
    if (alpha >= policy.avalancheWeight) {
      // Pure avalanche: all surplus to highest-APR debt
      allocation.debtAllocations.push({ debtId: highestAprDebt.id, amount: surplus });
      roundAndReconcile(allocation, surplus, "debt");
      return allocation;
    }

    const smallestBalanceDebt = getSmallestBalanceDebt(snapshot) ?? highestAprDebt;
    if (smallestBalanceDebt.id === highestAprDebt.id) {
      allocation.debtAllocations.push({ debtId: highestAprDebt.id, amount: surplus });
      roundAndReconcile(allocation, surplus, "debt");
      return allocation;
    }

    // Blended: avalanche weight to highest APR, snowball weight to smallest balance
    allocation.debtAllocations.push({
      debtId: highestAprDebt.id,
      amount: Math.round(surplus * policy.blendedAvalancheWeight),
    });
    allocation.debtAllocations.push({
      debtId: smallestBalanceDebt.id,
      amount: Math.round(surplus * policy.blendedSnowballWeight),
    });
    roundAndReconcile(allocation, surplus, "debt");
    return allocation;
  }

  const bufferNeeded = Math.max(0, bTarget - snapshot.bufferBalance);
  allocation.bufferContribution = Math.min(surplus, bufferNeeded);
  allocation.investmentContribution = surplus - allocation.bufferContribution;
  roundAndReconcile(allocation, surplus, "investment");
  return allocation;
}

